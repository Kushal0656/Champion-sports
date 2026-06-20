import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getPlayers } from "../api/playerApi";
import { getInnings, createInnings, updateInningsPersonnel } from "../api/inningsApi";
import { getMatches } from "../api/matchApi";
import { addBall, undoLastBall } from "../api/ballApi";
import { getActiveScene, updateDraftLayout, publishScene } from "../api/streamStudioApi";

export default function LiveScoringPage() {
  const [innings, setInnings] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  const [matchId, setMatchId] = useState(() => localStorage.getItem("live_scoring_match_id") || "");
  const [inningsId, setInningsId] = useState(() => {
    const saved = localStorage.getItem("live_scoring_innings_id");
    return saved ? Number(saved) : "";
  });
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const [selectedInnings, setSelectedInnings] = useState(null);
  const [activeScene, setActiveScene] = useState(null);
  const [scoreboardVisible, setScoreboardVisible] = useState(false);

  useEffect(() => {
    loadPlayers();
    loadInnings();
    loadMatches();
    fetchActiveScene();
  }, []);

  // Auto-select active innings and personnel when matchId changes or innings load
  useEffect(() => {
    if (matchId && innings.length > 0 && !inningsId) {
      const match = matches.find((m) => m.id === Number(matchId));
      if (match) {
        const matchInnings = innings.filter((i) => i.match?.id === match.id);
        if (matchInnings.length > 0) {
          const savedInningsId = localStorage.getItem(`live_scoring_innings_id_match_${matchId}`);
          let activeInnings = null;
          if (savedInningsId) {
            activeInnings = matchInnings.find((i) => i.id === Number(savedInningsId));
          }
          if (!activeInnings) {
            const activeInningsNum = match.currentInnings || 1;
            activeInnings = matchInnings.find((i) => i.inningsNumber === activeInningsNum) || matchInnings[matchInnings.length - 1];
          }
          if (activeInnings) {
            setInningsId(activeInnings.id);
            setSelectedInnings(activeInnings);
            setStrikerId(activeInnings.striker?.id ? String(activeInnings.striker.id) : "");
            setNonStrikerId(activeInnings.nonStriker?.id ? String(activeInnings.nonStriker.id) : "");
            setBowlerId(activeInnings.currentBowler?.id ? String(activeInnings.currentBowler.id) : "");
            localStorage.setItem("live_scoring_innings_id", String(activeInnings.id));
            localStorage.setItem(`live_scoring_innings_id_match_${matchId}`, String(activeInnings.id));
          }
        }
      }
    }
  }, [matchId, innings, matches, inningsId]);

  const fetchActiveScene = async () => {
    try {
      const scene = await getActiveScene();
      if (scene) {
        setActiveScene(scene);
        const elements = JSON.parse(scene.draftLayout || "[]");
        const sbEl = elements.find(el => el.type === "scoreboard" || el.type === "mini_scoreboard");
        setScoreboardVisible(sbEl ? sbEl.visible : false);
      }
    } catch (error) {
      console.error("Failed to load active scene", error);
    }
  };

  useEffect(() => {
    if (inningsId) {
      fetchActiveScene();
    }
  }, [inningsId]);

  const handleToggleScoreboard = async () => {
    try {
      const scene = await getActiveScene();
      if (!scene) {
        alert("No active OBS scene found. Please activate a scene in Overlay Studio first.");
        return;
      }
      
      let elements = [];
      try {
        elements = JSON.parse(scene.draftLayout || "[]");
      } catch (e) {
        elements = [];
      }
      
      const sbIndex = elements.findIndex(el => el.type === "scoreboard" || el.type === "mini_scoreboard");
      
      let nextVisibleState = true;
      if (sbIndex > -1) {
        nextVisibleState = !elements[sbIndex].visible;
        elements[sbIndex].visible = nextVisibleState;
        if (elements[sbIndex].x === undefined) elements[sbIndex].x = 50;
        if (elements[sbIndex].y === undefined) elements[sbIndex].y = 85;
        if (elements[sbIndex].width === undefined) elements[sbIndex].width = 850;
        if (elements[sbIndex].height === undefined) elements[sbIndex].height = 60;
      } else {
        // Add new default scoreboard element
        elements.push({
          id: "scoreboard_" + Date.now(),
          type: "scoreboard",
          name: "Live Scoreboard",
          x: 50,
          y: 85,
          width: 850,
          height: 60,
          zIndex: 50,
          visible: true
        });
        nextVisibleState = true;
      }
      
      // Save draft layout
      await updateDraftLayout(scene.id, JSON.stringify(elements));
      // Publish live
      await publishScene(scene.id, Number(matchId) || 0);
      
      setScoreboardVisible(nextVisibleState);
      setActiveScene({ ...scene, draftLayout: JSON.stringify(elements) });
    } catch (error) {
      console.error("Failed to toggle scoreboard", error);
      alert("Error updating OBS screen: " + error.message);
    }
  };

  const loadPlayers = async () => {
    try {
      const data = await getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadInnings = async () => {
    try {
      const data = await getInnings();
      setInnings(data);

      if (inningsId) {
        const inning = data.find((i) => i.id === Number(inningsId));
        setSelectedInnings(inning);
        if (inning) {
          setStrikerId(inning.striker?.id ? String(inning.striker.id) : "");
          setNonStrikerId(inning.nonStriker?.id ? String(inning.nonStriker.id) : "");
          setBowlerId(inning.currentBowler?.id ? String(inning.currentBowler.id) : "");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartInnings = async (inningsNo) => {
    const match = matches.find((m) => m.id === Number(matchId));
    if (!match) {
      alert("Select match first");
      return;
    }

    try {
      const battingTeam = inningsNo === 1 ? match.teamA : match.teamB;
      const bowlingTeam = inningsNo === 1 ? match.teamB : match.teamA;

      const newInnings = await createInnings({
        match: { id: match.id },
        battingTeam: { id: battingTeam.id },
        bowlingTeam: { id: bowlingTeam.id },
        inningsNumber: inningsNo,
      });

      alert(`Innings ${inningsNo} Started successfully`);
      await loadInnings();
      setInningsId(newInnings.id);
      setSelectedInnings(newInnings);
      localStorage.setItem("live_scoring_innings_id", String(newInnings.id));
      if (matchId) {
        localStorage.setItem(`live_scoring_innings_id_match_${matchId}`, String(newInnings.id));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to start innings");
    }
  };

  const scoreBall = async (runs, wicket = false, wide = false, noBall = false) => {
    if (!inningsId || !strikerId || !nonStrikerId || !bowlerId) {
      alert("Select innings, striker, non-striker and bowler");
      return;
    }

    try {
      await addBall({
        innings: {
          id: Number(inningsId),
        },
        striker: {
          id: Number(strikerId),
        },
        nonStriker: {
          id: Number(nonStrikerId),
        },
        bowler: {
          id: Number(bowlerId),
        },
        runs,
        wicket,
        wide,
        noBall,
      });

      await loadInnings();
    } catch (error) {
      console.error(error);
      alert("Failed to record ball: " + (error.response?.data?.message || error.message));
    }
  };

  const handleUndo = async () => {
    if (!inningsId) {
      alert("Select innings first");
      return;
    }

    if (window.confirm("Revert the last scored delivery? All stats will be automatically rolled back.")) {
      try {
        await undoLastBall(Number(inningsId));
        await loadInnings();
        alert("Last delivery successfully undone");
      } catch (error) {
        console.error(error);
        alert("Failed to undo last ball. Make sure there are balls to undo.");
      }
    }
  };

  const isLocked = selectedInnings?.completed || selectedInnings?.match?.status === "COMPLETED";

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>⚡ Live Scoring Console</h1>
            <p style={{ color: "var(--text-secondary)" }}>Record ball-by-ball actions for live matches.</p>
          </div>
          {inningsId && (
            <div style={{ marginLeft: "auto" }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleUndo}
                style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
              >
                ↩️ Undo Last Ball
              </button>
            </div>
          )}
        </div>

        <div className="grid-3" style={{ marginBottom: "2rem" }}>
          {/* Match & Innings Selector */}
          <div className="premium-card" style={{ gridColumn: "span 3" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>🏏 Select Match & Innings</h2>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: 1, minWidth: "250px", marginBottom: 0 }}>
                <label className="form-label">1. Select Match</label>
                <select
                  className="form-select"
                  value={matchId}
                  onChange={(e) => {
                    const mId = e.target.value;
                    setMatchId(mId);
                    if (mId) {
                      localStorage.setItem("live_scoring_match_id", mId);
                      const savedInningsId = localStorage.getItem(`live_scoring_innings_id_match_${mId}`);
                      if (savedInningsId) {
                        const id = Number(savedInningsId);
                        setInningsId(id);
                        const inning = innings.find((i) => i.id === id);
                        setSelectedInnings(inning || null);
                        if (inning) {
                          setStrikerId(inning.striker?.id ? String(inning.striker.id) : "");
                          setNonStrikerId(inning.nonStriker?.id ? String(inning.nonStriker.id) : "");
                          setBowlerId(inning.currentBowler?.id ? String(inning.currentBowler.id) : "");
                          localStorage.setItem("live_scoring_innings_id", String(id));
                        } else {
                          setStrikerId("");
                          setNonStrikerId("");
                          setBowlerId("");
                        }
                      } else {
                        setInningsId("");
                        setSelectedInnings(null);
                        setStrikerId("");
                        setNonStrikerId("");
                        setBowlerId("");
                        localStorage.removeItem("live_scoring_innings_id");
                      }
                    } else {
                      localStorage.removeItem("live_scoring_match_id");
                      localStorage.removeItem("live_scoring_innings_id");
                      setInningsId("");
                      setSelectedInnings(null);
                      setStrikerId("");
                      setNonStrikerId("");
                      setBowlerId("");
                    }
                  }}
                >
                  <option value="">Select Match</option>
                  {matches
                    .filter((m) => m.status !== "COMPLETED")
                    .map((match) => (
                      <option key={match.id} value={match.id}>
                        {match.teamA?.name} vs {match.teamB?.name} ({match.venue})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: "250px", marginBottom: 0 }}>
                <label className="form-label">2. Select Active Innings</label>
                <select
                  className="form-select"
                  value={inningsId}
                  disabled={!matchId}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : "";
                    setInningsId(id);
                    const inning = innings.find((i) => i.id === id);
                    setSelectedInnings(inning || null);
                    if (inning) {
                      setStrikerId(inning.striker?.id ? String(inning.striker.id) : "");
                      setNonStrikerId(inning.nonStriker?.id ? String(inning.nonStriker.id) : "");
                      setBowlerId(inning.currentBowler?.id ? String(inning.currentBowler.id) : "");
                      localStorage.setItem("live_scoring_innings_id", String(id));
                      if (matchId) {
                        localStorage.setItem(`live_scoring_innings_id_match_${matchId}`, String(id));
                      }
                    } else {
                      setStrikerId("");
                      setNonStrikerId("");
                      setBowlerId("");
                      localStorage.removeItem("live_scoring_innings_id");
                      if (matchId) {
                        localStorage.removeItem(`live_scoring_innings_id_match_${matchId}`);
                      }
                    }
                  }}
                >
                  <option value="">Select Active Innings</option>
                  {innings
                    .filter((inning) => inning.match?.id === Number(matchId))
                    .map((inning) => (
                      <option key={inning.id} value={inning.id}>
                        {inning.battingTeam?.name} Innings #{inning.inningsNumber}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {matchId && (
              <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-light)", paddingTop: "1rem" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-secondary)", marginRight: "1rem" }}>Quick Actions:</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleStartInnings(1)}
                  style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", marginRight: "0.75rem" }}
                >
                  🏏 Start Innings 1
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleStartInnings(2)}
                  style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                >
                  🏏 Start Innings 2
                </button>
              </div>
            )}
          </div>
        </div>

        {selectedInnings && (
          <>
            {/* Top Scorecard Preview & OBS Toggle Card */}
            <div 
              className="premium-card" 
              style={{ 
                background: "linear-gradient(135deg, #0f172a, #1e293b)", 
                border: scoreboardVisible ? "2px solid #10b981" : "1px solid var(--border-light)", 
                padding: "1.25rem", 
                marginBottom: "2rem",
                position: "relative",
                overflow: "hidden",
                boxShadow: scoreboardVisible ? "0 0 15px rgba(16, 185, 129, 0.25)" : "var(--shadow-md)",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }}
              onClick={handleToggleScoreboard}
            >
              {/* Status indicator badge */}
              <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: scoreboardVisible ? "#10b981" : "#cbd5e1",
                  boxShadow: scoreboardVisible ? "0 0 8px #10b981" : "none"
                }} />
                <span style={{ 
                  fontSize: "0.75rem", 
                  fontWeight: "800", 
                  color: scoreboardVisible ? "#10b981" : "var(--text-muted)",
                  letterSpacing: "0.05em"
                }}>
                  {scoreboardVisible ? "ON OBS OVERLAY" : "HIDDEN ON OBS"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "2rem", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ color: "#fbbf24", fontWeight: "900", fontSize: "1.4rem", fontFamily: "var(--font-heading)" }}>
                      {selectedInnings.battingTeam?.name || "Batting"}
                    </span>
                    <span style={{ color: "#ffffff", fontWeight: "900", fontSize: "1.75rem" }}>
                      {selectedInnings.runs}/{selectedInnings.wickets}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "1rem", fontWeight: "600" }}>
                      ({selectedInnings.overs}.{selectedInnings.balls} Overs)
                    </span>
                  </div>
                  
                  {/* Current Active Striker/Non-Striker/Bowler display */}
                  <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "#cbd5e1", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#fbbf24" }}>★</span>
                      <span style={{ fontWeight: "700" }}>
                        {players.find(p => p.id === Number(strikerId))?.name || "Striker"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#cbd5e1" }}>Non-Striker:</span>
                      <span style={{ fontWeight: "600" }}>
                        {players.find(p => p.id === Number(nonStrikerId))?.name || "Non-Striker"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "#f43f5e" }}>🥎</span>
                      <span style={{ fontWeight: "700" }}>
                        {players.find(p => p.id === Number(bowlerId))?.name || "Bowler"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <button 
                    className="btn"
                    style={{
                      backgroundColor: scoreboardVisible ? "#dc2626" : "#10b981",
                      color: "white",
                      fontWeight: "800",
                      fontSize: "0.85rem",
                      padding: "0.6rem 1.2rem",
                      border: "none",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      cursor: "pointer"
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleScoreboard();
                    }}
                  >
                    {scoreboardVisible ? "❌ Remove from OBS" : "📺 Add to OBS Screen"}
                  </button>
                </div>
              </div>
            </div>

            {/* Lock Warning */}
            {isLocked && (
              <div 
                className="premium-card" 
                style={{ 
                  background: "var(--danger-light)", 
                  border: "1px solid var(--danger)", 
                  color: "var(--danger-hover)", 
                  marginBottom: "2rem",
                  textAlign: "center",
                  padding: "1.5rem"
                }}
              >
                <h2 style={{ color: "var(--danger-hover)", fontSize: "1.4rem", margin: 0 }}>
                  🔒 Scoring Locked (Innings/Match Completed)
                </h2>
                <p style={{ fontSize: "0.9rem", marginTop: "0.25rem" }}>
                  This match has been completed or innings locked. Reopening or edits are disabled.
                </p>
              </div>
            )}

            <div className="grid-3" style={{ marginBottom: "2rem" }}>
              {/* Score Display Card */}
              <div className="premium-card" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "220px" }}>
                <span className="badge badge-primary" style={{ width: "fit-content", marginBottom: "0.5rem" }}>
                  {selectedInnings.battingTeam?.name} Innings
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "1rem" }}>
                  <h1 style={{ fontSize: "5rem", fontWeight: "900", margin: 0, color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    {selectedInnings.runs}/{selectedInnings.wickets}
                  </h1>
                  <h3 style={{ color: "var(--text-secondary)", fontSize: "1.75rem", fontWeight: "500" }}>
                    ({selectedInnings.overs}.{selectedInnings.balls} Overs)
                  </h3>
                </div>
                {selectedInnings.match?.overs && (
                  <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    Target/Overs Limit: {selectedInnings.match.overs} Overs
                  </span>
                )}
              </div>

              {/* Roster / Active Players Selection */}
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.2rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.5rem" }}>Active Personnel</h2>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Striker</label>
                  <select
                    className="form-select"
                    value={strikerId}
                    disabled={isLocked}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setStrikerId(val);
                      if (inningsId) {
                        try {
                          await updateInningsPersonnel(inningsId, val, nonStrikerId, bowlerId);
                          await loadInnings();
                        } catch (err) {
                          console.error("Failed to update striker", err);
                        }
                      }
                    }}
                  >
                    <option value="">Select Striker</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Non-Striker</label>
                  <select
                    className="form-select"
                    value={nonStrikerId}
                    disabled={isLocked}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setNonStrikerId(val);
                      if (inningsId) {
                        try {
                          await updateInningsPersonnel(inningsId, strikerId, val, bowlerId);
                          await loadInnings();
                        } catch (err) {
                          console.error("Failed to update non-striker", err);
                        }
                      }
                    }}
                  >
                    <option value="">Select Non-Striker</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bowler</label>
                  <select
                    className="form-select"
                    value={bowlerId}
                    disabled={isLocked}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setBowlerId(val);
                      if (inningsId) {
                        try {
                          await updateInningsPersonnel(inningsId, strikerId, nonStrikerId, val);
                          await loadInnings();
                        } catch (err) {
                          console.error("Failed to update bowler", err);
                        }
                      }
                    }}
                  >
                    <option value="">Select Bowler</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Score Pad / Input Buttons */}
            <div className="premium-card" style={{ opacity: isLocked ? 0.6 : 1 }}>
              <h2 style={{ fontSize: "1.35rem", marginBottom: "1.5rem" }}>⚡ Scoring Console Pad</h2>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(0)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "#334155", color: "white" }}
                >
                  0
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(1)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--primary)", color: "white" }}
                >
                  1
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(2)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--primary)", color: "white" }}
                >
                  2
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(3)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--primary)", color: "white" }}
                >
                  3
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(4)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--success)", color: "white", fontWeight: "800" }}
                >
                  4
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(6)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--success)", color: "white", fontWeight: "800" }}
                >
                  6
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(0, true)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--danger)", color: "white", fontWeight: "800" }}
                >
                  OUT
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(1, false, true)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--warning)", color: "white" }}
                >
                  WD
                </button>

                <button
                  className="btn"
                  disabled={isLocked}
                  onClick={() => scoreBall(1, false, false, true)}
                  style={{ width: "90px", height: "70px", fontSize: "1.5rem", backgroundColor: "var(--warning)", color: "white" }}
                >
                  NB
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}