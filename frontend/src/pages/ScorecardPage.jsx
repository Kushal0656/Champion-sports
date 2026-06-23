import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getScorecard } from "../api/scorecardApi";
import { getInnings } from "../api/inningsApi";
import { getMatches } from "../api/matchApi";
import { getContentByKey } from "../api/contentApi";

const getYoutubeEmbedUrl = (url) => {
  if (!url) return "";
  let videoId = null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
  } catch (error) {
    console.error("Failed to parse YouTube URL", error);
  }
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes("youtube.com/embed/")) {
    return url;
  }
  return "";
};

export default function ScorecardPage() {
  const [innings, setInnings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchId, setMatchId] = useState(() => localStorage.getItem("scorecard_match_id") || "");
  const [inningsId, setInningsId] = useState(() => localStorage.getItem("scorecard_innings_id") || "");
  const [scorecard, setScorecard] = useState(null);
  const [liveMatchId, setLiveMatchId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMatchId = params.get("matchId");
    const urlInningsId = params.get("inningsId");
    
    let mId = urlMatchId || localStorage.getItem("scorecard_match_id");
    let iId = urlInningsId || localStorage.getItem("scorecard_innings_id");
    
    // If the match changed in the URL, clear any saved innings ID that belongs to a different match
    if (urlMatchId && urlMatchId !== localStorage.getItem("scorecard_match_id")) {
      iId = "";
      localStorage.removeItem("scorecard_innings_id");
      setInningsId("");
      setScorecard(null);
    }
    
    if (mId) {
      setMatchId(mId);
      localStorage.setItem("scorecard_match_id", mId);
    }
    if (iId) {
      setInningsId(iId);
      localStorage.setItem("scorecard_innings_id", iId);
      loadScorecard(iId);
    } else {
      setInningsId("");
      setScorecard(null);
    }
    
    loadInnings();
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);
      
      const params = new URLSearchParams(window.location.search);
      let mId = params.get("matchId") || localStorage.getItem("scorecard_match_id");
      if (!mId && data.length > 0) {
        // Auto-select LIVE match first, otherwise the most recent one
        const liveMatch = data.find(m => m.status === "LIVE");
        const defaultMatch = liveMatch || data[data.length - 1];
        if (defaultMatch) {
          setMatchId(String(defaultMatch.id));
          localStorage.setItem("scorecard_match_id", String(defaultMatch.id));
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadInnings = async () => {
    try {
      const data = await getInnings();
      setInnings(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadScorecard = async (id) => {
    try {
      const data = await getScorecard(id);
      setScorecard(data);
    } catch (error) {
      console.error(error);
    }
  };

  const getMatchResultMargin = (match, matchInnings) => {
    if (match.resultMargin) return match.resultMargin;
    if (matchInnings.length < 2) return "";
    
    const sortedInnings = [...matchInnings].sort((a, b) => a.inningsNumber - b.inningsNumber);
    const first = sortedInnings[0];
    const second = sortedInnings[1];
    
    if (second.runs > first.runs) {
      return `Won by ${10 - second.wickets} wickets`;
    } else if (first.runs > second.runs) {
      return `Won by ${first.runs - second.runs} runs`;
    } else {
      return "Match Tied";
    }
  };

  // Auto-select innings for live/scheduled matches, or clear for completed ones
  useEffect(() => {
    if (matches.length > 0 && innings.length > 0 && matchId) {
      const selectedMatch = matches.find(m => m.id === Number(matchId));
      if (selectedMatch) {
        const matchInnings = innings.filter(inn => inn.match?.id === selectedMatch.id);
        
        if (selectedMatch.status === "COMPLETED") {
          // Keep current innings selection if valid for this match
          const isValidInnings = matchInnings.some(inn => String(inn.id) === inningsId);
          if (!isValidInnings && inningsId) {
            setInningsId("");
            localStorage.removeItem("scorecard_innings_id");
            setScorecard(null);
          }
        } else {
          // LIVE or SCHEDULED match: auto-select active innings
          const activeInningsNum = selectedMatch.currentInnings || 1;
          const defaultInning = matchInnings.find(inn => inn.inningsNumber === activeInningsNum)
                                || matchInnings[matchInnings.length - 1];
          
          if (defaultInning && String(defaultInning.id) !== inningsId) {
            setInningsId(String(defaultInning.id));
            localStorage.setItem("scorecard_innings_id", String(defaultInning.id));
            loadScorecard(defaultInning.id);
          }
        }
      }
    }
  }, [matches, innings, matchId]);

  // Auto-refresh scorecard if match is live (every 8s - reduces backend load vs 1s hammering)
  useEffect(() => {
    let intervalId;
    intervalId = setInterval(() => {
      loadMatches();
      loadInnings();
      const selectedMatch = matches.find(m => m.id === Number(matchId));
      if (selectedMatch && selectedMatch.status === "LIVE") {
        if (inningsId) {
          loadScorecard(inningsId);
        }
      }
    }, 8000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [matchId, inningsId, matches]);

  // Load live match configuration from backend content settings
  useEffect(() => {
    const fetchLiveMatchConfig = async () => {
      try {
        const mIdContent = await getContentByKey("live_match_id");
        if (mIdContent && mIdContent.value) {
          setLiveMatchId(mIdContent.value);
        }
      } catch (error) {
        console.error("Error loading live match config", error);
      }
    };
    fetchLiveMatchConfig();
  }, []);

  const getQuickMatchLink = () => {
    if (matches.length === 0) return null;
    
    // 1. Check if there's an ongoing live match ID configured from live scoring portal
    if (liveMatchId) {
      const liveMatch = matches.find(m => m.id === Number(liveMatchId));
      if (liveMatch) {
        return {
          id: liveMatch.id,
          name: `${liveMatch.teamA?.name} vs ${liveMatch.teamB?.name}`,
          venue: liveMatch.venue,
          isLive: true
        };
      }
    }
    
    // 2. Otherwise check matches with status "LIVE"
    const activeLiveMatch = matches.find(m => m.status === "LIVE");
    if (activeLiveMatch) {
      return {
        id: activeLiveMatch.id,
        name: `${activeLiveMatch.teamA?.name} vs ${activeLiveMatch.teamB?.name}`,
        venue: activeLiveMatch.venue,
        isLive: true
      };
    }
    
    // 3. Otherwise find the most recent match for which score is given (has innings)
    const matchesWithInnings = matches.filter(m => 
      innings.some(inn => inn.match?.id === m.id)
    );
    if (matchesWithInnings.length > 0) {
      const sorted = [...matchesWithInnings].sort((a, b) => b.id - a.id);
      const mostRecent = sorted[0];
      return {
        id: mostRecent.id,
        name: `${mostRecent.teamA?.name} vs ${mostRecent.teamB?.name}`,
        venue: mostRecent.venue,
        isLive: false
      };
    }
    
    return null;
  };

  const quickMatchLink = getQuickMatchLink();

  const selectedMatch = matches.find(m => m.id === Number(matchId));
  const matchInnings = innings.filter(inn => inn.match?.id === Number(matchId));
  const inning1 = matchInnings.find(inn => inn.inningsNumber === 1);
  const inning2 = matchInnings.find(inn => inn.inningsNumber === 2);

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1>📋 Match Scorecard</h1>
          <p style={{ color: "var(--text-secondary)" }}>Detailed stats, batting runs, and bowling figures for completed and active innings.</p>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", marginBottom: quickMatchLink ? "1.25rem" : 0 }}>
            <div className="form-group" style={{ flex: 1, minWidth: "250px", marginBottom: 0 }}>
              <label className="form-label">1. Select Match</label>
              <select
                className="form-select"
                value={matchId}
                onChange={(e) => {
                  const mId = e.target.value;
                  setMatchId(mId);
                  setInningsId("");
                  setScorecard(null);
                  if (mId) {
                    localStorage.setItem("scorecard_match_id", mId);
                  } else {
                    localStorage.removeItem("scorecard_match_id");
                  }
                  localStorage.removeItem("scorecard_innings_id");
                }}
              >
                <option value="">Select Match</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {match.teamA?.name} vs {match.teamB?.name} ({match.venue})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: "250px", marginBottom: 0 }}>
              <label className="form-label">2. Select Innings</label>
              <select
                className="form-select"
                value={inningsId}
                disabled={!matchId}
                onChange={(e) => {
                  const id = e.target.value;
                  setInningsId(id);
                  if (id) {
                    loadScorecard(id);
                    localStorage.setItem("scorecard_innings_id", id);
                  } else {
                    setScorecard(null);
                    localStorage.removeItem("scorecard_innings_id");
                  }
                }}
              >
                <option value="">Select Innings</option>
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
          
          {quickMatchLink && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderTop: "1px solid var(--border-light)", paddingTop: "0.85rem", fontSize: "0.85rem" }}>
              <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>
                {quickMatchLink.isLive ? "🔴 Ongoing Live Match:" : "⚾ Most Recent Match:"}
              </span>
              <button
                className="btn btn-secondary"
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", height: "auto", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                onClick={() => {
                  setMatchId(String(quickMatchLink.id));
                  localStorage.setItem("scorecard_match_id", String(quickMatchLink.id));
                  setInningsId("");
                  localStorage.removeItem("scorecard_innings_id");
                  setScorecard(null);
                }}
              >
                {quickMatchLink.name} ({quickMatchLink.venue})
              </button>
            </div>
          )}
        </div>

        {/* Live Streaming Video Player */}
        {matchId && (() => {
          const selectedMatch = matches.find(m => m.id === Number(matchId));
          if (selectedMatch && selectedMatch.streamUrl) {
            const embedUrl = getYoutubeEmbedUrl(selectedMatch.streamUrl);
            if (embedUrl) {
              return (
                <div className="premium-card" style={{ padding: "1.5rem", marginBottom: "2.5rem" }}>
                  <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>📺 Live Stream Feed</h2>
                  <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "12px", boxShadow: "var(--shadow-md)" }}>
                    <iframe
                      src={`${embedUrl}?autoplay=1&mute=1`}
                      title="Match Live Stream"
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    <a
                      href={selectedMatch.streamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      🚀 Open Video in YouTube
                    </a>
                  </div>
                </div>
              );
            }
          }
          return null;
        })()}

        {scorecard ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {selectedMatch && selectedMatch.status === "COMPLETED" && (
              <button
                className="btn btn-secondary"
                style={{ alignSelf: "start", padding: "0.45rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                onClick={() => {
                  setInningsId("");
                  localStorage.removeItem("scorecard_innings_id");
                  setScorecard(null);
                }}
              >
                ⬅️ Back to Match Summary
              </button>
            )}

            {/* Batting Scorecard */}
            <div className="premium-card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.35rem", marginBottom: "1.25rem", color: "var(--primary)" }}>🏏 Batting Scorecard</h2>
              <div className="table-container" style={{ marginTop: 0 }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Batsman</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Runs</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Balls</th>
                      <th style={{ width: "80px", textAlign: "center" }}>4s</th>
                      <th style={{ width: "80px", textAlign: "center" }}>6s</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.batting.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                          No batting stats recorded yet.
                        </td>
                      </tr>
                    ) : (
                      scorecard.batting.map((bat) => (
                        <tr key={bat.id}>
                          <td style={{ fontWeight: "700" }}>{bat.player?.name}</td>
                          <td style={{ textAlign: "center", fontWeight: "800", color: "var(--text-primary)" }}>{bat.runs}</td>
                          <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{bat.balls}</td>
                          <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{bat.fours}</td>
                          <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{bat.sixes}</td>
                          <td style={{ textAlign: "center" }}>
                            {bat.out ? (
                              <span className="badge badge-danger">OUT</span>
                            ) : (
                              <span className="badge badge-success">NOT OUT</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowling Scorecard */}
            <div className="premium-card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1.35rem", marginBottom: "1.25rem", color: "var(--primary)" }}>🎯 Bowling Figures</h2>
              <div className="table-container" style={{ marginTop: 0 }}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Bowler</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Overs</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Runs Conceded</th>
                      <th style={{ width: "120px", textAlign: "center" }}>Wickets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.bowling.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                          No bowling stats recorded yet.
                        </td>
                      </tr>
                    ) : (
                      scorecard.bowling.map((bowl) => (
                        <tr key={bowl.id}>
                          <td style={{ fontWeight: "700" }}>{bowl.player?.name}</td>
                          <td style={{ textAlign: "center", fontWeight: "600" }}>{bowl.overs}</td>
                          <td style={{ textAlign: "center", color: "var(--danger)" }}>{bowl.runsConceded}</td>
                          <td style={{ textAlign: "center", fontWeight: "800", color: "var(--success)" }}>{bowl.wickets}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed view selector just below the scorecard */}
            {selectedMatch && matchInnings.length > 0 && (
              <div className="premium-card" style={{ padding: "1.5rem", textAlign: "center" }}>
                <p style={{ fontWeight: "600", color: "var(--text-secondary)", marginBottom: "1rem" }}>🔍 Select innings for detailed scorecard view:</p>
                <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                  {matchInnings.map((inn) => (
                    <button
                      key={inn.id}
                      className={`btn ${String(inn.id) === inningsId ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: "600" }}
                      onClick={() => {
                        setInningsId(String(inn.id));
                        localStorage.setItem("scorecard_innings_id", String(inn.id));
                        loadScorecard(inn.id);
                      }}
                    >
                      🏏 {inn.battingTeam?.shortName || inn.battingTeam?.name} Innings #{inn.inningsNumber}
                    </button>
                  ))}
                  {selectedMatch.status === "COMPLETED" && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", fontWeight: "600" }}
                      onClick={() => {
                        setInningsId("");
                        localStorage.removeItem("scorecard_innings_id");
                        setScorecard(null);
                      }}
                    >
                      🏆 View Winner Summary
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : selectedMatch && selectedMatch.status === "COMPLETED" ? (
          /* For completed matches, show winning summary by default */
          <div className="premium-card" style={{ padding: "2.5rem", textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="badge badge-success" style={{ marginBottom: "1rem", fontSize: "0.9rem", padding: "0.4rem 0.8rem" }}>🏁 Match Completed</span>
            <h2 style={{ fontSize: "2rem", marginBottom: "0.5rem", color: "var(--success)" }}>
              {selectedMatch.winner ? `${selectedMatch.winner.name} Won` : "Match Tied"}
            </h2>
            <p style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {getMatchResultMargin(selectedMatch, matchInnings)}
            </p>
            
            <div style={{ display: "flex", justifyContent: "center", gap: "3rem", flexWrap: "wrap", margin: "2rem 0", padding: "1.5rem 0", borderTop: "1px solid var(--border-light)", borderBottom: "1px solid var(--border-light)" }}>
              {inning1 && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.9rem", textTransform: "uppercase", tracking: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>1st Innings</div>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>{inning1.battingTeam?.name}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--primary)", marginTop: "0.25rem" }}>
                    {inning1.runs}/{inning1.wickets}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>({inning1.overs}.{inning1.balls} overs)</div>
                </div>
              )}
              {inning2 && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.9rem", textTransform: "uppercase", tracking: "0.05em", color: "var(--text-muted)", marginBottom: "0.25rem" }}>2nd Innings</div>
                  <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>{inning2.battingTeam?.name}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--primary)", marginTop: "0.25rem" }}>
                    {inning2.runs}/{inning2.wickets}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>({inning2.overs}.{inning2.balls} overs)</div>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <p style={{ fontWeight: "600", color: "var(--text-secondary)", marginBottom: "1rem" }}>🔍 Select innings for detailed scorecard view:</p>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                {matchInnings.map((inn) => (
                  <button
                    key={inn.id}
                    className="btn btn-secondary"
                    style={{ padding: "0.6rem 1.5rem", fontWeight: "600" }}
                    onClick={() => {
                      setInningsId(String(inn.id));
                      localStorage.setItem("scorecard_innings_id", String(inn.id));
                      loadScorecard(inn.id);
                    }}
                  >
                    🏏 {inn.battingTeam?.shortName || inn.battingTeam?.name} Innings #{inn.inningsNumber}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>Select an innings above to fetch and view the detailed scorecard.</p>
          </div>
        )}
      </div>
    </div>
  );
}