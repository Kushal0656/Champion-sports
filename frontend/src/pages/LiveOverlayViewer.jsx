import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getActiveScene, getScenes } from "../api/streamStudioApi";
import { getLiveScore, getScorecardState } from "../api/liveScoreApi";
import { getTeams } from "../api/teamApi";
import { getApiBaseUrl, getWsBaseUrl } from "../utils/config";

export default function LiveOverlayViewer({ sceneId: propSceneId }) {
  const { sceneId: pathSceneId } = useParams();
  const [searchParams] = useSearchParams();
  const queryInningsId = searchParams.get("inningsId");
  const queryMatchId = searchParams.get("matchId") || "0";

  const targetSceneId = propSceneId || pathSceneId;

  const [activeScene, setActiveScene] = useState(null);
  const [layoutElements, setLayoutElements] = useState([]);
  const [score, setScore] = useState(null);
  const [teams, setTeams] = useState([]);
  const [inningsId, setInningsId] = useState(queryInningsId || "");
  const [matchId, setMatchId] = useState(queryMatchId);

  // Active overlay animation state
  const [overlayAnim, setOverlayAnim] = useState(null); // { type: "FOUR" | "SIX" | "WICKET" | "CUSTOM", meta: "..." }
  const [animVisible, setAnimVisible] = useState(false);

  // Fetch initial scene configuration and team data
  useEffect(() => {
    loadTeams();
    loadSceneData();
  }, [targetSceneId]);

  // If no inningsId is provided, look up the active innings from the match
  useEffect(() => {
    if (!inningsId && matchId && matchId !== "0") {
      fetchLiveScoreByMatch(matchId);
    } else if (inningsId) {
      fetchLiveScore(inningsId);
    }
  }, [inningsId, matchId]);

  // Establish WebSocket connection for real-time synchronization
  useEffect(() => {
    const ws = new WebSocket(`${getWsBaseUrl()}/ws-score`);

    ws.onopen = () => {
      console.log("WebSocket connected to OBS overlay source");
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("Overlay WS Received:", payload);

        if (payload.type === "SCORE_UPDATE") {
          // If the matchId matches or we're watching any active match
          const normalized = normalizeScore(payload.data);
          setScore(normalized);
          if (normalized && normalized.inningsId) {
            setInningsId(normalized.inningsId);
          }
        } else if (payload.type === "OVERLAY_UPDATE") {
          const actionData = payload.data;
          if (actionData.action === "PUBLISH_SCENE") {
            // If it's a publish for the scene we are currently rendering
            if (targetSceneId === actionData.sceneId || (!targetSceneId && activeScene?.id === actionData.sceneId)) {
              try {
                const parsed = JSON.parse(actionData.liveLayout);
                setLayoutElements(Array.isArray(parsed) ? parsed : []);
              } catch (e) {
                console.error("Failed to parse published layout", e);
              }
            }
          } else if (actionData.action === "SWITCH_SCENE") {
            // For unified overlay viewers that follow the active scene automatically
            if (!targetSceneId) {
              loadSceneData();
            }
          } else if (actionData.action === "TRIGGER_ANIMATION") {
            // Trigger overlay animations (e.g. boundary celebrations)
            triggerCelebration(actionData.animationType, actionData.meta);
          }
        }
      } catch (err) {
        console.error("WebSocket message parse error", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("WebSocket closed. Attempting reconnect in 3s...");
      setTimeout(() => {
        // Simple reconnect logic
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [targetSceneId, activeScene]);

  const normalizeScore = (rawScore) => {
    if (!rawScore) return null;
    
    // If it's a ScorecardStateDTO
    const match = rawScore.match;
    const liveInfo = rawScore.liveInfo;
    
    if (match || liveInfo) {
      const activeInningsNum = match?.currentInnings || 1;
      const activeInnings = activeInningsNum === 2 ? rawScore.innings2 : rawScore.innings1;
      
      let runs = activeInnings?.runs ?? 0;
      let overs = activeInnings?.overs ?? 0;
      let balls = activeInnings?.balls ?? 0;
      let totalBalls = overs * 6 + balls;
      let runRate = totalBalls > 0 ? ((runs / totalBalls) * 6).toFixed(2) : "0.00";
      
      return {
        inningsId: activeInnings?.id,
        battingTeam: activeInnings?.battingTeam?.name ?? match?.teamA?.name ?? "TEAM A",
        bowlingTeam: activeInnings?.bowlingTeam?.name ?? match?.teamB?.name ?? "TEAM B",
        runs: runs,
        wickets: activeInnings?.wickets ?? 0,
        overs: `${overs}.${balls}`,
        runRate: runRate,
        requiredRunRate: "0.00",
        striker: liveInfo?.strikerName ?? "Striker",
        strikerId: liveInfo?.strikerId,
        strikerRuns: liveInfo?.strikerStats?.runsScored ?? 0,
        strikerBalls: liveInfo?.strikerStats?.ballsFaced ?? 0,
        nonStriker: liveInfo?.nonStrikerName ?? "Non-Striker",
        nonStrikerId: liveInfo?.nonStrikerId,
        nonStrikerRuns: liveInfo?.nonStrikerStats?.runsScored ?? 0,
        nonStrikerBalls: liveInfo?.nonStrikerStats?.ballsFaced ?? 0,
        bowler: liveInfo?.bowlerName ?? "Bowler",
        bowlerId: liveInfo?.bowlerId,
        bowlerRuns: liveInfo?.bowlerStats?.runsConceded ?? 0,
        bowlerWickets: liveInfo?.bowlerStats?.wicketsTaken ?? 0,
        bowlerOvers: liveInfo?.bowlerStats?.oversBowled ?? "0.0",
        tournamentName: match?.tournament?.name ?? "Tournament",
        venue: match?.venue ?? "Venue",
        matchName: match ? `${match.teamA?.name} vs ${match.teamB?.name}` : "Match",
        tossWinner: match?.tossWinner?.name ?? "",
        matchResult: match?.status === "COMPLETED" ? (match.winner ? `${match.winner.name} won` : "Match Tied") : "Live Match",
        partnershipRuns: 0,
        partnershipBalls: 0,
        liveInfo: liveInfo
      };
    }
    
    return {
      ...rawScore,
      runRate: rawScore.runRate ?? rawScore.currentRunRate ?? "0.00",
      strikerId: rawScore.strikerId,
      nonStrikerId: rawScore.nonStrikerId,
      bowlerId: rawScore.bowlerId
    };
  };

  const loadTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (e) {
      console.error("Failed to load teams", e);
    }
  };

  const loadSceneData = async () => {
    try {
      let scene;
      if (targetSceneId) {
        const scenes = await getScenes();
        scene = scenes.find((s) => s.id === targetSceneId);
      } else {
        scene = await getActiveScene();
      }

      if (scene) {
        setActiveScene(scene);
        try {
          const parsed = JSON.parse(scene.liveLayout || "[]");
          setLayoutElements(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error("Error parsing live layout JSON", e);
          setLayoutElements([]);
        }
      }
    } catch (err) {
      console.error("Failed to load overlay scene", err);
    }
  };

  const fetchLiveScore = async (id) => {
    try {
      const data = await getLiveScore(id);
      setScore(normalizeScore(data));
    } catch (e) {
      console.error("Failed to fetch score", e);
    }
  };

  const fetchLiveScoreByMatch = async (mId) => {
    try {
      const data = await getScorecardState(mId);
      const normalized = normalizeScore(data);
      setScore(normalized);
      if (normalized && normalized.inningsId) {
        setInningsId(normalized.inningsId);
      }
    } catch (e) {
      console.error("Failed to fetch score by match", e);
    }
  };

  const triggerCelebration = (type, meta) => {
    setOverlayAnim({ type, meta });
    setAnimVisible(true);
    // Dismiss after 4.5 seconds
    setTimeout(() => {
      setAnimVisible(false);
    }, 4500);
  };

  // Helper to replace variable placeholders with real-time values
  const replacePlaceholders = (text) => {
    if (!text) return "";
    let result = text;
    const dataMap = {
      "{runs}": score?.runs ?? "0",
      "{wickets}": score?.wickets ?? "0",
      "{overs}": score?.overs ?? "0.0",
      "{run_rate}": score?.runRate ?? "0.0",
      "{req_run_rate}": score?.requiredRunRate ?? "0.0",
      "{striker_name}": score?.striker ?? "Batsman",
      "{striker_runs}": score?.strikerRuns ?? "0",
      "{striker_balls}": score?.strikerBalls ?? "0",
      "{non_striker_name}": score?.nonStriker ?? "Batsman",
      "{non_striker_runs}": score?.nonStrikerRuns ?? "0",
      "{non_striker_balls}": score?.nonStrikerBalls ?? "0",
      "{bowler_name}": score?.bowler ?? "Bowler",
      "{bowler_runs}": score?.bowlerRuns ?? "0",
      "{bowler_wickets}": score?.bowlerWickets ?? "0",
      "{bowler_overs}": score?.bowlerOvers ?? "0.0",
      "{batting_team}": score?.battingTeam ?? "Batting",
      "{bowling_team}": score?.bowlingTeam ?? "Bowling",
      "{tournament_name}": score?.tournamentName ?? "Tournament",
      "{venue}": score?.venue ?? "Venue",
      "{match_name}": score?.matchName ?? "Match",
      "{toss_winner}": score?.tossWinner ?? "Toss Winner",
      "{match_result}": score?.matchResult ?? "Live Match",
      "{partnership_runs}": score?.partnershipRuns ?? "0",
      "{partnership_balls}": score?.partnershipBalls ?? "0"
    };

    Object.keys(dataMap).forEach((key) => {
      result = result.replace(new RegExp(key, "g"), dataMap[key]);
    });
    return result;
  };

  // Render individual element based on its type
  const renderElement = (el) => {
    if (!el.visible) return null;

    const transformStyle = {
      position: "absolute",
      left: `${el.x}%`,
      top: `${el.y}%`,
      transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
      zIndex: el.zIndex || 10,
      width: el.width ? `${el.width}px` : "auto",
      height: el.height ? `${el.height}px` : "auto",
      pointerEvents: "none"
    };

    // Inner render element layout
    const renderInnerContent = () => {
      // 1. Standalone Scoreboard Element
      if (el.type === "scoreboard") {
        const battingTeamName = score?.battingTeam || "Toss";
        const bowlingTeamName = score?.bowlingTeam || "Opponent";
        const battingTeamObj = teams.find((t) => t.name === battingTeamName || t.shortName === battingTeamName);
        const bowlingTeamObj = teams.find((t) => t.name === bowlingTeamName || t.shortName === bowlingTeamName);
        const battingLogo = battingTeamObj?.id ? `${getApiBaseUrl()}/api/teams/${battingTeamObj.id}/logo` : null;
        const bowlingLogo = bowlingTeamObj?.id ? `${getApiBaseUrl()}/api/teams/${bowlingTeamObj.id}/logo` : null;

        return (
          <div className="broadcast-scoreboard">
            {/* Left Accent & Batting Logo */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "4px", height: "50px", background: "linear-gradient(to bottom, #d97706, #fef08a, #d97706)", borderRadius: "2px" }} />
              <div className="logo-box">
                {battingLogo ? (
                  <img src={battingLogo} alt="batting team" />
                ) : (
                  <span>{battingTeamName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            {/* Score Ticker */}
            <div className="ticker-main">
              <div className="ticker-top">
                <div className="ticker-team">{battingTeamName}</div>
                <div className="ticker-score">{score ? `${score.runs}-${score.wickets}` : "0-0"}</div>
                <div className="ticker-overs">{score?.overs || "0.0"} OVERS</div>
                <div className="ticker-vs">v {bowlingTeamName}</div>
                <div className="ticker-tourney">{score?.tournamentName || "LIVE BROADCAST"}</div>
              </div>
              <div className="ticker-bottom">
                <div className="ticker-batsman" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {score?.strikerId && (
                    <img 
                      src={`${getApiBaseUrl()}/api/players/${score.strikerId}/photo`} 
                      alt="" 
                      style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", border: "1px solid #fbbf24" }} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span className="name">{score?.striker ? `★ ${score.striker}` : "Striker"}</span>
                  <span className="runs">{score?.strikerRuns ?? 0}</span>
                  <span className="balls">({score?.strikerBalls ?? 0})</span>
                </div>
                <div className="ticker-batsman" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {score?.nonStrikerId && (
                    <img 
                      src={`${getApiBaseUrl()}/api/players/${score.nonStrikerId}/photo`} 
                      alt="" 
                      style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1" }} 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span className="name">{score?.nonStriker || "Non-Striker"}</span>
                  <span className="runs">{score?.nonStrikerRuns ?? 0}</span>
                  <span className="balls">({score?.nonStrikerBalls ?? 0})</span>
                </div>
                <div className="ticker-bowler">
                  <span className="name">{score?.bowler || "Bowler"}</span>
                  <span className="wickets-runs">{score?.bowlerWickets ?? 0}-{score?.bowlerRuns ?? 0}</span>
                  <span className="overs">({score?.bowlerOvers ?? "0.0"})</span>
                </div>
              </div>
            </div>

            {/* Right Accent & Bowling Logo */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="logo-box">
                {bowlingLogo ? (
                  <img src={bowlingLogo} alt="bowling team" />
                ) : (
                  <span>{bowlingTeamName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div style={{ width: "4px", height: "50px", background: "linear-gradient(to bottom, #d97706, #fef08a, #d97706)", borderRadius: "2px" }} />
            </div>
          </div>
        );
      }

      // 2. Mini IPL Scoreboard Element
      if (el.type === "mini_scoreboard") {
        return (
          <div className="mini-ipl-scoreboard">
            <div className="mini-row-1">
              <span className="mini-team">{score?.battingTeam || "TEAM"}</span>
              <span className="mini-score">{score ? `${score.runs}/${score.wickets}` : "0/0"}</span>
            </div>
            <div className="mini-row-2">
              <span className="mini-label">OVERS</span>
              <span className="mini-value">{score?.overs || "0.0"}</span>
              <span className="mini-crr">CRR {score?.runRate || "0.0"}</span>
            </div>
            <div className="mini-row-3">
              <div className="mini-bat">★ {score?.striker || "Batsman"} ({score?.strikerRuns || 0})</div>
              <div className="mini-bowl">Bowl: {score?.bowler || "Bowler"} ({score?.bowlerWickets || 0}/{score?.bowlerRuns || 0})</div>
            </div>
          </div>
        );
      }

      // 3. Toss Card
      if (el.type === "toss_card") {
        return (
          <div className="overlay-popup-card">
            <div className="popup-header">🪙 TOSS DECISION</div>
            <div className="popup-body">
              <div style={{ fontSize: "2rem", fontWeight: "800", color: "#6366f1", marginBottom: "1rem" }}>
                {score?.tossWinner || "Toss Winner"}
              </div>
              <div style={{ fontSize: "1.25rem", color: "#475569", fontWeight: "600" }}>
                Won the toss and elected to bat first
              </div>
            </div>
          </div>
        );
      }

      // 4. Result Card
      if (el.type === "result_card") {
        return (
          <div className="overlay-popup-card">
            <div className="popup-header">🏆 MATCH RESULT</div>
            <div className="popup-body">
              <div style={{ fontSize: "2rem", fontWeight: "900", color: "#10b981", marginBottom: "1rem" }}>
                {score?.matchResult || "Match Completed"}
              </div>
              <div style={{ fontSize: "1.1rem", color: "#64748b" }}>
                Thank you for tuning in!
              </div>
            </div>
          </div>
        );
      }

      // 5. Match Start Card
      if (el.type === "match_start_card") {
        return (
          <div className="overlay-popup-card">
            <div className="popup-header">🏏 MATCH PREVIEW</div>
            <div className="popup-body">
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", margin: "1.5rem 0" }}>
                <div style={{ fontWeight: "900", fontSize: "1.8rem" }}>{score?.battingTeam || "TEAM A"}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#ef4444" }}>VS</div>
                <div style={{ fontWeight: "900", fontSize: "1.8rem" }}>{score?.bowlingTeam || "TEAM B"}</div>
              </div>
              <div style={{ fontSize: "1.1rem", color: "#475569" }}>
                📍 Venue: {score?.venue || "Cricket Stadium"}
              </div>
            </div>
          </div>
        );
      }

      // 6. Innings Break Card
      if (el.type === "innings_break_card") {
        return (
          <div className="overlay-popup-card">
            <div className="popup-header">⏸️ INNINGS BREAK</div>
            <div className="popup-body">
              <div style={{ fontSize: "1.5rem", color: "#475569", marginBottom: "0.5rem" }}>
                End of Innings
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: "900", color: "#6366f1" }}>
                Score: {score?.runs}-{score?.wickets} ({score?.overs} Ov)
              </div>
              <div style={{ fontSize: "1.1rem", color: "#475569", marginTop: "1rem" }}>
                Required Run Rate: {score?.requiredRunRate || "0.00"}
              </div>
            </div>
          </div>
        );
      }

      // 7. Player of the Match Card
      if (el.type === "pom_card") {
        return (
          <div className="overlay-popup-card">
            <div className="popup-header">🏅 PLAYER OF THE MATCH</div>
            <div className="popup-body">
              <div style={{ fontSize: "2rem", fontWeight: "900", color: "#d97706", marginBottom: "0.5rem" }}>
                {replacePlaceholders(el.text) || "Player Name"}
              </div>
              <div style={{ fontSize: "1.25rem", color: "#475569" }}>
                Outstanding Match Performance
              </div>
            </div>
          </div>
        );
      }

      // 8. Sponsor Banner
      if (el.type === "sponsor_banner") {
        const fallbackAd = el.imageUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";
        return (
          <div className="sponsor-ad-banner">
            <img src={fallbackAd} alt="Sponsor Ad" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "12px" }} />
            <div className="ad-tag">SPONSOR AD</div>
          </div>
        );
      }

      // 9. Watermark
      if (el.type === "watermark") {
        return (
          <div className="watermark-logo">
            ⚡ {replacePlaceholders(el.text) || "CHAMPION SPORTS"}
          </div>
        );
      }

      // 9b. Batsman Card Element
      if (el.type === "batsman_card") {
        return (
          <div className="broadcast-card batsman-card">
            <div className="card-header">🏏 BATSMEN STATUS</div>
            <div className="card-row active-bat" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {score?.strikerId && (
                <img 
                  src={`${getApiBaseUrl()}/api/players/${score.strikerId}/photo`} 
                  alt="" 
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #6366f1" }} 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={{ flex: 1 }}>
                <span className="card-name">★ {score?.striker || "Striker"}</span>
              </div>
              <span className="card-runs">{score?.strikerRuns ?? 0} <span className="card-balls">({score?.strikerBalls ?? 0})</span></span>
            </div>
            <div className="card-row" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {score?.nonStrikerId && (
                <img 
                  src={`${getApiBaseUrl()}/api/players/${score.nonStrikerId}/photo`} 
                  alt="" 
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "1px solid #cbd5e1" }} 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={{ flex: 1 }}>
                <span className="card-name">{score?.nonStriker || "Non-Striker"}</span>
              </div>
              <span className="card-runs">{score?.nonStrikerRuns ?? 0} <span className="card-balls">({score?.nonStrikerBalls ?? 0})</span></span>
            </div>
            {score?.partnershipRuns !== undefined && (
              <div className="card-footer">
                Partnership: {score.partnershipRuns} ({score.partnershipBalls})
              </div>
            )}
          </div>
        );
      }

      // 9c. Bowler Card Element
      if (el.type === "bowler_card") {
        return (
          <div className="broadcast-card bowler-card">
            <div className="card-header">🥎 CURRENT BOWLER</div>
            <div className="card-row">
              <span className="card-name">{score?.bowler || "Bowler"}</span>
              <span className="card-runs" style={{ color: "#f43f5e" }}>
                {score?.bowlerWickets ?? 0} - {score?.bowlerRuns ?? 0}
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "4px" }}>({score?.bowlerOvers ?? "0.0"} Ov)</span>
              </span>
            </div>
            <div className="card-footer">
              CRR: {score?.runRate || "0.0"}
            </div>
          </div>
        );
      }

      // 9d. Match Info Card Element
      if (el.type === "match_info_card") {
        return (
          <div className="broadcast-card match-info-card">
            <div className="card-header">📊 MATCH INFO</div>
            <div className="card-body-flat">
              <div style={{ marginBottom: "2px" }}>📍 Venue: <strong>{score?.venue || "Venue"}</strong></div>
              <div style={{ marginBottom: "2px" }}>🏆 Tourney: <strong>{score?.tournamentName || "League"}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "4px", marginTop: "4px" }}>
                <span>CRR: <strong>{score?.runRate || "0.0"}</strong></span>
                {score?.requiredRunRate !== undefined && <span>RRR: <strong>{score.requiredRunRate}</strong></span>}
              </div>
            </div>
          </div>
        );
      }

      // 10. Image/Video Element (like logos, banners, clips)
      if (el.type === "image" || el.type === "video") {
        const srcUrl = el.assetId ? `${getApiBaseUrl()}/api/overlay-studio/assets/${el.assetId}/file` : el.imageUrl;
        const isVideo = el.type === "video" || (srcUrl && (srcUrl.toLowerCase().endsWith(".mp4") || srcUrl.toLowerCase().endsWith(".webm") || srcUrl.toLowerCase().includes("video")));

        return (
          <div style={{ width: "100%", height: "100%" }}>
            {srcUrl ? (
              isVideo ? (
                <video
                  src={srcUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    opacity: el.opacity ?? 1
                  }}
                />
              ) : (
                <img
                  src={srcUrl}
                  alt="Overlay Asset"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    opacity: el.opacity ?? 1
                  }}
                />
              )
            ) : (
              <div style={{ width: "100%", height: "100%", background: "#e2e8f0", border: "2px dashed #94a3b8", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#64748b" }}>
                Empty {el.type.toUpperCase()} Slot
              </div>
            )}
          </div>
        );
      }

      // 11. Default Custom Text Card
      const textStyle = {
        color: el.style?.color || "#ffffff",
        fontSize: el.style?.fontSize || "20px",
        fontWeight: el.style?.fontWeight || "bold",
        fontFamily: el.style?.fontFamily || "Outfit, sans-serif",
        backgroundColor: el.style?.backgroundColor || "rgba(15,23,42,0.85)",
        borderRadius: el.style?.borderRadius || "8px",
        padding: el.style?.padding || "10px",
        border: el.style?.border || "2px solid #6366f1",
        textAlign: el.style?.textAlign || "center",
        textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        whiteSpace: "pre-line",
        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)"
      };

      return (
        <div style={textStyle}>
          {replacePlaceholders(el.text)}
        </div>
      );
    };

    return (
      <div style={transformStyle} key={el.id}>
        <div className={el.animation ? `animate-${el.animation}` : ""} style={{ width: "100%", height: "100%" }}>
          {renderInnerContent()}
        </div>
      </div>
    );
  };

  return (
    <div className="live-overlay-container">
      {activeScene?.videoFileName && (
        <video
          src={`${getApiBaseUrl()}/api/overlay-studio/scenes/${activeScene.id}/video`}
          key={activeScene.videoFileName}
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none"
          }}
        />
      )}
      {/* Dynamic inline styles for broadcast elements */}
      <style>{`
        .live-overlay-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: transparent;
          overflow: hidden;
          margin: 0;
          padding: 0;
          pointer-events: none;
        }

        /* Entry Animations */
        .animate-fade {
          animation: overlayFadeIn 0.6s ease-out forwards;
        }
        .animate-slide {
          animation: overlaySlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-zoom {
          animation: overlayZoomIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes overlaySlideIn {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes overlayZoomIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* Broadcast Card Classes */
        .broadcast-card {
          background: #ffffff;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
        }
        .broadcast-card .card-header {
          background: linear-gradient(90deg, #6366f1, #4f46e5);
          color: #ffffff;
          font-weight: 800;
          font-size: 0.85rem;
          padding: 8px 12px;
          text-align: center;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .broadcast-card .card-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .broadcast-card .card-row.active-bat {
          background: rgba(99, 102, 241, 0.08);
        }
        .broadcast-card .card-name {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.95rem;
        }
        .broadcast-card .card-runs {
          font-weight: 900;
          color: #6366f1;
          font-size: 1rem;
        }
        .broadcast-card .card-balls {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }
        .broadcast-card .card-footer {
          margin-top: auto;
          background: #f8fafc;
          padding: 8px 16px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
          text-align: center;
          border-top: 1px solid #f1f5f9;
        }
        .broadcast-card .card-body-flat {
          padding: 12px 16px;
          font-size: 0.85rem;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Scoreboard Styling */
        .broadcast-scoreboard {
          display: flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid #eab308;
          border-radius: 12px;
          height: 60px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
        }
        .logo-box {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(30, 41, 59, 0.9);
          border-radius: 8px;
          margin: 0 8px;
        }
        .logo-box img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 4px;
        }
        .logo-box span {
          font-size: 1.25rem;
          font-weight: 900;
          color: #facc15;
        }
        .ticker-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0 12px;
          overflow: hidden;
        }
        .ticker-top {
          display: flex;
          align-items: center;
          height: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ticker-team {
          color: #fbbf24;
          font-weight: 800;
          font-size: 1.1rem;
          margin-right: 12px;
        }
        .ticker-score {
          color: #ffffff;
          font-weight: 900;
          font-size: 1.3rem;
          margin-right: 12px;
        }
        .ticker-overs {
          color: #e2e8f0;
          font-weight: 600;
          font-size: 0.85rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 12px;
        }
        .ticker-vs {
          color: #ea580c;
          font-weight: 800;
          font-size: 0.9rem;
          margin-right: auto;
        }
        .ticker-tourney {
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .ticker-bottom {
          display: flex;
          align-items: center;
          height: 26px;
          font-size: 0.8rem;
          color: #cbd5e1;
          gap: 16px;
        }
        .ticker-batsman {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ticker-batsman .name {
          color: #a5b4fc;
          font-weight: 700;
        }
        .ticker-batsman .runs {
          color: #ffffff;
          font-weight: 800;
        }
        .ticker-batsman .balls {
          color: #94a3b8;
          font-size: 0.75rem;
        }
        .ticker-bowler {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ticker-bowler .name {
          color: #94a3b8;
          font-weight: 600;
        }
        .ticker-bowler .wickets-runs {
          color: #f43f5e;
          font-weight: 800;
        }
        .ticker-bowler .overs {
          font-size: 0.75rem;
        }

        /* Mini Scoreboard */
        .mini-ipl-scoreboard {
          background: rgba(15, 23, 42, 0.95);
          border-left: 4px solid #6366f1;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          font-family: 'Outfit', sans-serif;
          color: #ffffff;
        }
        .mini-row-1 {
          display: flex;
          justify-content: space-between;
          font-size: 1.25rem;
          font-weight: 900;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        .mini-team { color: #facc15; }
        .mini-row-2 {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: #cbd5e1;
          margin-bottom: 6px;
        }
        .mini-crr {
          margin-left: auto;
          background: rgba(99, 102, 241, 0.3);
          padding: 1px 4px;
          border-radius: 3px;
        }
        .mini-row-3 {
          font-size: 0.75rem;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Watermark */
        .watermark-logo {
          background: rgba(30, 41, 59, 0.7);
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 0.85rem;
          letter-spacing: 0.1em;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        /* Popup overlay cards */
        .overlay-popup-card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          border: 2px solid #e2e8f0;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
          animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .popup-header {
          background: linear-gradient(90deg, #6366f1, #4f46e5);
          color: #ffffff;
          font-weight: 800;
          font-size: 1.1rem;
          padding: 10px 20px;
          text-align: center;
          letter-spacing: 0.05em;
        }
        .popup-body {
          padding: 24px;
          text-align: center;
        }

        /* Sponsor Ad */
        .sponsor-ad-banner {
          position: relative;
          width: 100%;
          height: 100%;
          box-shadow: 0 15px 30px rgba(0,0,0,0.25);
        }
        .ad-tag {
          position: absolute;
          top: 8px;
          left: 8px;
          background: rgba(15, 23, 42, 0.85);
          color: #fbbf24;
          font-weight: 900;
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        /* Celebratory Animations Container */
        .celebration-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.5s ease;
          opacity: 0;
          pointer-events: none;
          z-index: 9999;
        }
        .celebration-overlay.visible {
          opacity: 1;
        }
        .celebration-banner {
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          color: #ffffff;
          text-align: center;
          transform: scale(0.5);
          transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .celebration-overlay.visible .celebration-banner {
          transform: scale(1);
        }
        .banner-text-huge {
          font-size: 8rem;
          text-shadow: 0 0 20px rgba(255,255,255,0.6), 0 10px 30px rgba(0,0,0,0.8);
          letter-spacing: 0.05em;
          animation: pulse 1s infinite alternate;
        }
        .banner-meta {
          font-size: 2rem;
          color: #facc15;
          margin-top: 1rem;
          text-shadow: 0 4px 8px rgba(0,0,0,0.8);
          font-weight: 700;
        }

        /* Keyframes */
        @keyframes scaleUp {
          from { transform: translate(-50%, -50%) scale(0.85); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(0.95); }
          100% { transform: scale(1.05); }
        }
      `}</style>

      {/* Render layout elements dynamically */}
      {layoutElements.map((el) => renderElement(el))}

      {/* Broadcast overlay animation screen */}
      <div className={`celebration-overlay ${animVisible ? "visible" : ""}`} style={{
        backgroundColor: overlayAnim?.type === "WICKET" ? "rgba(225, 29, 72, 0.5)" :
                         overlayAnim?.type === "SIX" ? "rgba(99, 102, 241, 0.5)" :
                         overlayAnim?.type === "FOUR" ? "rgba(16, 185, 129, 0.5)" : "rgba(15, 23, 42, 0.5)"
      }}>
        {overlayAnim && (
          <div className="celebration-banner">
            <div className="banner-text-huge" style={{
              color: overlayAnim.type === "WICKET" ? "#f43f5e" :
                     overlayAnim.type === "SIX" ? "#818cf8" :
                     overlayAnim.type === "FOUR" ? "#34d399" : "#fbbf24"
            }}>
              {overlayAnim.type}
            </div>
            {overlayAnim.meta && (
              <div className="banner-meta">
                {overlayAnim.meta}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
