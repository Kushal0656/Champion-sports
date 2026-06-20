import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getDashboard } from "../api/dashboardApi";
import { getMatches } from "../api/matchApi";
import { getInnings } from "../api/inningsApi";
import { getContentByKey, updateContentByKey } from "../api/contentApi";
import { isAdminLoggedIn, logoutAdmin } from "../utils/auth";
import { getApiBaseUrl } from "../utils/config";

import { getTournaments } from "../api/tournamentApi";
import { getPointsTable } from "../api/pointsTableApi";
import { getScorecard } from "../api/scorecardApi";

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [matches, setMatches] = useState([]);
  const [innings, setInnings] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [matchesOnDate, setMatchesOnDate] = useState([]);
  const [loadingVideo, setLoadingVideo] = useState(true);



  // Scorecard and Points Table guest features states
  const [scorecardMatchId, setScorecardMatchId] = useState("");
  const [scorecardInningsId, setScorecardInningsId] = useState("");
  const [scorecardData, setScorecardData] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [pointsTableRows, setPointsTableRows] = useState([]);
  const [pointsTableLoading, setPointsTableLoading] = useState(false);

  const [liveMatchId, setLiveMatchId] = useState("");
  const [liveInningsId, setLiveInningsId] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [liveConfigLoaded, setLiveConfigLoaded] = useState(false);



  const loggedIn = isAdminLoggedIn();

  const loadLiveMatchConfig = async () => {
    try {
      const mIdContent = await getContentByKey("live_match_id");
      const iIdContent = await getContentByKey("live_innings_id");
      
      const mId = mIdContent ? mIdContent.value : "";
      const iId = iIdContent ? iIdContent.value : "";
      
      setLiveMatchId(mId);
      setLiveInningsId(iId);
      setLiveConfigLoaded(true);
    } catch (error) {
      console.error("Error loading live match config", error);
      setLiveConfigLoaded(true);
    }
  };

  const handleClearLiveMatch = async () => {
    try {
      await updateContentByKey("live_match_id", "");
      await updateContentByKey("live_innings_id", "");
      setLiveMatchId("");
      setLiveInningsId("");
      alert("Live status cleared successfully!");
    } catch (error) {
      console.error("Error clearing live status", error);
      alert("Failed to clear live status");
    }
  };

  useEffect(() => {
    loadDashboard();
    loadMatches();
    loadVideoUrl();
    loadInnings();
    loadTournaments();
    loadLiveMatchConfig();

    // Auto-refresh scorecard of the selected match in real-time without lag
    const scorecardInterval = setInterval(() => {
      loadLiveMatchConfig();
      loadInnings();
      loadMatches();
      const currentInningsId = localStorage.getItem("dashboard_scorecard_innings_id");
      if (currentInningsId) {
        loadScorecard(currentInningsId);
      }
    }, 1000);

    return () => {
      clearInterval(scorecardInterval);
    };
  }, []);

  // Auto-select match scorecard: prioritize LIVE match, otherwise most recent match
  useEffect(() => {
    if (matches.length > 0 && innings.length > 0 && liveConfigLoaded && !isInitialized) {
      const liveMatch = matches.find(m => m.status === "LIVE") || 
                        (liveMatchId ? matches.find(m => m.id === Number(liveMatchId)) : null);
      
      let targetMatch = liveMatch;
      let targetInnings = null;
      
      if (liveMatch) {
        const matchInnings = innings.filter(i => i.match?.id === liveMatch.id);
        const liveInnings = matchInnings.find(i => String(i.id) === liveInningsId) || 
                            matchInnings[matchInnings.length - 1];
        
        targetMatch = liveMatch;
        targetInnings = liveInnings;
      } else {
        const savedMId = localStorage.getItem("dashboard_scorecard_match_id");
        const savedIId = localStorage.getItem("dashboard_scorecard_innings_id");
        
        const savedMatch = savedMId ? matches.find(m => m.id === Number(savedMId)) : null;
        if (savedMatch) {
          const matchInnings = innings.filter(i => i.match?.id === savedMatch.id);
          const savedInning = matchInnings.find(i => String(i.id) === savedIId) || 
                              matchInnings[matchInnings.length - 1];
          
          targetMatch = savedMatch;
          targetInnings = savedInning;
        } else {
          const sorted = [...matches].sort((a, b) => b.id - a.id);
          const mostRecentMatch = sorted[0];
          if (mostRecentMatch) {
            const matchInnings = innings.filter(i => i.match?.id === mostRecentMatch.id);
            const lastInning = matchInnings[matchInnings.length - 1];
            
            targetMatch = mostRecentMatch;
            targetInnings = lastInning;
          }
        }
      }
      
      if (targetMatch) {
        setScorecardMatchId(String(targetMatch.id));
        localStorage.setItem("dashboard_scorecard_match_id", String(targetMatch.id));
        
        if (targetInnings) {
          setScorecardInningsId(String(targetInnings.id));
          loadScorecard(targetInnings.id);
          localStorage.setItem("dashboard_scorecard_innings_id", String(targetInnings.id));
        } else {
          setScorecardInningsId("");
          localStorage.removeItem("dashboard_scorecard_innings_id");
        }
      }
      
      setIsInitialized(true);
    }
  }, [matches, innings, liveInningsId, liveMatchId, liveConfigLoaded, isInitialized]);

  const loadDashboard = async () => {
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error("Error loading dashboard", error);
    }
  };

  const loadMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);
    } catch (error) {
      console.error("Error loading matches", error);
    }
  };

  const loadInnings = async () => {
    try {
      const data = await getInnings();
      setInnings(data);
    } catch (error) {
      console.error("Error loading innings", error);
    }
  };

  const loadSlides = async () => {
    try {
      const data = await getSlides();
      setSlides(data);
    } catch (error) {
      console.error("Error loading slides on dashboard", error);
    }
  };

  const loadActiveSlide = async () => {
    try {
      const data = await getActiveSlide();
      setActiveSlide(data);
    } catch (error) {
      console.error("Error loading active slide on dashboard", error);
    }
  };



  const loadTournaments = async () => {
    try {
      const data = await getTournaments();
      setTournaments(data);
      if (data.length > 0) {
        setSelectedTournamentId(data[0].id.toString());
        loadPointsTable(data[0].id);
      }
    } catch (error) {
      console.error("Error loading tournaments", error);
    }
  };

  const loadPointsTable = async (tournamentId) => {
    if (!tournamentId) {
      setPointsTableRows([]);
      return;
    }
    try {
      setPointsTableLoading(true);
      const data = await getPointsTable(tournamentId);
      setPointsTableRows(data);
    } catch (error) {
      console.error("Error loading points table", error);
    } finally {
      setPointsTableLoading(false);
    }
  };

  const loadScorecard = async (inningsId) => {
    try {
      const data = await getScorecard(inningsId);
      setScorecardData(data);
    } catch (error) {
      console.error("Error loading scorecard", error);
    }
  };

  const loadVideoUrl = async () => {
    try {
      setLoadingVideo(true);
      const content = await getContentByKey("homepage_video_url");
      if (content && content.value) {
        setVideoUrl(content.value);
        setVideoInput(content.value);
      }
    } catch (error) {
      console.error("Error loading video URL", error);
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleSaveVideoUrl = async () => {
    try {
      await updateContentByKey("homepage_video_url", videoInput);
      setVideoUrl(videoInput);
      setShowModal(false);
      alert("Homepage video URL updated successfully");
    } catch (error) {
      console.error("Error saving video URL", error);
      alert("Failed to save video URL");
    }
  };



  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
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
    return null;
  };

  // Filter next 6 upcoming/live matches sorted by date
  const upcomingMatches = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "LIVE")
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))
    .slice(0, 6);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (!date) {
      setMatchesOnDate([]);
      return;
    }

    const filtered = matches.filter((m) => {
      if (!m.matchDate) return false;
      const mDate = new Date(m.matchDate).toISOString().split("T")[0];
      return mDate === date;
    });
    setMatchesOnDate(filtered);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "LIVE":
        return <span className="badge badge-danger">🔴 Live</span>;
      case "COMPLETED":
        return <span className="badge badge-success">🏁 Completed</span>;
      default:
        return <span className="badge badge-primary">📅 Scheduled</span>;
    }
  };

  const scorecardMatch = matches.find(m => m.id === Number(scorecardMatchId));
  const isScorecardMatchLive = scorecardMatch?.status === "LIVE" || (liveMatchId && Number(scorecardMatchId) === Number(liveMatchId));

  const embedUrl = getYoutubeEmbedUrl(videoUrl);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        
        {/* Top Header Row with Title and Admin Login Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800" }}>🏆 Champion Sports Central</h1>
            <p style={{ color: "var(--text-secondary)", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
              Live streams, match scorecards, group standings, and fixture history.
            </p>
          </div>
          <div>
            {loggedIn ? (
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span className="badge badge-success" style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>🟢 Admin Authenticated</span>
                <button 
                  className="btn btn-danger"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                  onClick={() => {
                    logoutAdmin();
                    alert("Logged out successfully");
                    window.location.href = "/";
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <a 
                href="/login" 
                className="btn btn-primary" 
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1.25rem", fontWeight: "700" }}
              >
                🔒 Admin Login
              </a>
            )}
          </div>
        </div>

        {/* 1. Featured Broadcast Feed (Full width) */}
        <div className="premium-card" style={{ width: "100%", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>📺 Featured Broadcast Feed</h2>
            {loggedIn && (
              <button className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={() => setShowModal(true)}>
                ⚙️ Update Video
              </button>
            )}
          </div>
          
          {loadingVideo ? (
            <div style={{ height: "300px", backgroundColor: "#0f172a", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <h3>Loading broadcast...</h3>
            </div>
          ) : embedUrl ? (
            <div>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "12px", boxShadow: "var(--shadow-md)" }}>
                <iframe
                  src={`${embedUrl}?autoplay=1&mute=1`}
                  title="Champion Sports Broadcast"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", padding: "0.5rem 1rem" }}
                >
                  🚀 Open in YouTube
                </a>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "500" }}>
                  🔊 Muted by default. Unmute player controls for sound.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "4rem 2rem", textAlign: "center", backgroundColor: "var(--bg-app)", borderRadius: "12px", border: "2px dashed var(--border-light)" }}>
              <span style={{ fontSize: "3rem", marginBottom: "1rem", display: "block" }}>🎥</span>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                No active broadcast stream is currently set by the administrator.
              </p>
              {loggedIn && (
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                  Set YouTube URL
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Interactive Live Scorecard / Live Match Scorecard */}
        <div className="premium-card" style={{ width: "100%", padding: "1.5rem", marginBottom: "2.5rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {isScorecardMatchLive && (
                  <span className="badge badge-danger" style={{ backgroundColor: "var(--danger)", color: "#fff" }}>🔴 LIVE</span>
                )}
                <h2 style={{ fontSize: "1.25rem", margin: 0 }}>
                  📋 Match Scorecard Statistics{!isScorecardMatchLive && scorecardMatch && ` - ${scorecardMatch.teamA?.name} vs ${scorecardMatch.teamB?.name}`}
                </h2>
              </div>
              {loggedIn && liveMatchId && (
                <button className="btn btn-secondary" style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }} onClick={handleClearLiveMatch}>
                  Clear Live Status
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              {isScorecardMatchLive && (
                <div className="form-group" style={{ flex: 1, minWidth: "150px", marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Select Match</label>
                  <select
                    className="form-select"
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                    value={scorecardMatchId}
                    onChange={(e) => {
                      const mId = e.target.value;
                      setScorecardMatchId(mId);
                      setScorecardData(null);
                      if (mId) {
                        localStorage.setItem("dashboard_scorecard_match_id", mId);
                        const matchInnings = innings.filter((i) => i.match?.id === Number(mId));
                        if (matchInnings.length > 0) {
                          const lastInning = matchInnings[matchInnings.length - 1];
                          setScorecardInningsId(String(lastInning.id));
                          loadScorecard(lastInning.id);
                          localStorage.setItem("dashboard_scorecard_innings_id", String(lastInning.id));
                        } else {
                          setScorecardInningsId("");
                          localStorage.removeItem("dashboard_scorecard_innings_id");
                        }
                      } else {
                        setScorecardInningsId("");
                        localStorage.removeItem("dashboard_scorecard_match_id");
                        localStorage.removeItem("dashboard_scorecard_innings_id");
                      }
                    }}
                  >
                    <option value="">Choose Match</option>
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.teamA?.name} vs {m.teamB?.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ flex: 1, minWidth: "150px", marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Select Innings</label>
                <select
                  className="form-select"
                  style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                  value={scorecardInningsId}
                  disabled={!scorecardMatchId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setScorecardInningsId(id);
                    if (id) {
                      loadScorecard(id);
                      localStorage.setItem("dashboard_scorecard_innings_id", id);
                    } else {
                      setScorecardData(null);
                      localStorage.removeItem("dashboard_scorecard_innings_id");
                    }
                  }}
                >
                  <option value="">Choose Innings</option>
                  {innings
                    .filter((i) => i.match?.id === Number(scorecardMatchId))
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.battingTeam?.name} Innings #{i.inningsNumber}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <a
                  href="/matches"
                  className="btn btn-primary"
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    height: "36px",
                    boxSizing: "border-box"
                  }}
                >
                  ➕ New Match
                </a>
              </div>
            </div>

            {/* Scorecard tables */}
            {scorecardData ? (
              <div>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  <div style={{ flex: 1.2, minWidth: "300px" }}>
                    <h4 style={{ fontSize: "0.9rem", color: "var(--primary)", marginBottom: "0.6rem" }}>🏏 Batting Performance</h4>
                    <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
                      <table className="premium-table" style={{ fontSize: "0.78rem", margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Batsman</th>
                            <th style={{ textAlign: "center" }}>R</th>
                            <th style={{ textAlign: "center" }}>B</th>
                            <th style={{ textAlign: "center" }}>4s/6s</th>
                            <th style={{ textAlign: "center" }}>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scorecardData.batting.length === 0 ? (
                            <tr>
                              <td colSpan="5" style={{ textAlign: "center", color: "var(--text-muted)", padding: "0.5rem" }}>No batting stats record.</td>
                            </tr>
                          ) : (
                            scorecardData.batting.map((bat) => (
                              <tr key={bat.id}>
                                <td style={{ fontWeight: "700" }}>{bat.player?.name}</td>
                                <td style={{ textAlign: "center", fontWeight: "800", color: "var(--text-primary)" }}>{bat.runs}</td>
                                <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{bat.balls}</td>
                                <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{bat.fours}/{bat.sixes}</td>
                                <td style={{ textAlign: "center" }}>
                                  <span className={`badge ${bat.out ? "badge-danger" : "badge-success"}`} style={{ fontSize: "0.6rem", padding: "0.1rem 0.25rem" }}>
                                    {bat.out ? "OUT" : "NO"}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: "250px" }}>
                    <h4 style={{ fontSize: "0.9rem", color: "var(--primary)", marginBottom: "0.6rem" }}>🎯 Bowling Figures</h4>
                    <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-light)", borderRadius: "6px" }}>
                      <table className="premium-table" style={{ fontSize: "0.78rem", margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Bowler</th>
                            <th style={{ textAlign: "center" }}>O</th>
                            <th style={{ textAlign: "center" }}>R</th>
                            <th style={{ textAlign: "center" }}>W</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scorecardData.bowling.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "0.5rem" }}>No bowling stats record.</td>
                            </tr>
                          ) : (
                            scorecardData.bowling.map((bowl) => (
                              <tr key={bowl.id}>
                                <td style={{ fontWeight: "700" }}>{bowl.player?.name}</td>
                                <td style={{ textAlign: "center" }}>{bowl.overs}</td>
                                <td style={{ textAlign: "center", color: "var(--danger)" }}>{bowl.runsConceded}</td>
                                <td style={{ textAlign: "center", fontWeight: "800", color: "var(--success)" }}>{bowl.wickets}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Spectator action links for the selected match */}
                {scorecardInningsId && (
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", borderTop: "1px solid var(--border-light)", paddingTop: "1.25rem", flexWrap: "wrap" }}>
                    <a
                      href={`/overlay?inningsId=${scorecardInningsId}&tournamentName=LIVE&obs=false`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      ⚡ View Live Scoring Ticker
                    </a>
                    <a
                      href={`/scorecard?matchId=${scorecardMatchId}&inningsId=${scorecardInningsId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      📋 View Detailed Scorecard
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "2rem 1.5rem", textAlign: "center", backgroundColor: "var(--bg-app)", borderRadius: "8px", border: "1px dashed var(--border-light)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {scorecardMatchId 
                  ? "No innings or scorecard data recorded for this match yet."
                  : "Select a match and innings above to fetch and view the detailed scorecard."}
              </div>
            )}
          </div>
        </div>

        {/* 3. Standings (Points Table) Card */}
        <div className="premium-card" style={{ width: "100%", padding: "1.5rem", marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>📊 Tournament Standings</h2>
            <select
              className="form-select"
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", width: "160px", marginBottom: 0 }}
              value={selectedTournamentId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedTournamentId(id);
                loadPointsTable(id);
              }}
            >
              <option value="">Select Tournament</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {pointsTableLoading ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <span style={{ fontSize: "0.9rem" }}>Loading Standings...</span>
            </div>
          ) : pointsTableRows.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", border: "1px dashed var(--border-light)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No standings records found. Select a tournament to load.
            </div>
          ) : (
            <div className="table-container" style={{ marginTop: 0, overflowX: "auto" }}>
              <table className="premium-table" style={{ fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: "35px", textAlign: "center" }}>Pos</th>
                    <th>Team</th>
                    <th style={{ textAlign: "center" }}>P</th>
                    <th style={{ textAlign: "center" }}>W</th>
                    <th style={{ textAlign: "center" }}>L</th>
                    <th style={{ textAlign: "center" }}>Pts</th>
                    <th style={{ textAlign: "center" }}>NRR</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTableRows.map((row, index) => {
                    const nrrValue = row.netRunRate || 0.0;
                    const isPositiveNrr = nrrValue >= 0;
                    return (
                      <tr key={row.id}>
                        <td style={{ textAlign: "center", fontWeight: "700", color: "var(--text-muted)" }}>{index + 1}</td>
                        <td style={{ fontWeight: "700" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "700" }}>
                              {row.team?.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{row.team?.name}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>{row.matchesPlayed}</td>
                        <td style={{ textAlign: "center", color: "var(--success)" }}>{row.wins}</td>
                        <td style={{ textAlign: "center", color: "var(--danger)" }}>{row.losses}</td>
                        <td style={{ textAlign: "center", fontWeight: "800", color: "var(--primary)" }}>{row.points}</td>
                        <td style={{ textAlign: "center", fontWeight: "700" }}>
                          <span style={{ fontSize: "0.75rem", color: isPositiveNrr ? "#10b981" : "#ef4444" }}>
                            {isPositiveNrr ? `+${nrrValue.toFixed(3)}` : nrrValue.toFixed(3)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>




        {/* Video config popup modal */}

        {showModal && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="premium-card" style={{ maxWidth: "500px", width: "100%", margin: "1rem", padding: "2rem", position: "relative" }}>
              <h2 style={{ marginBottom: "1.5rem" }}>⚙️ Configure Homepage Video</h2>
              
              <div className="form-group">
                <label className="form-label">YouTube URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                />
                <small style={{ display: "block", marginTop: "0.5rem", color: "var(--text-muted)" }}>
                  Enter any standard, short-form, or live YouTube link.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "end", gap: "1rem", marginTop: "2rem" }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSaveVideoUrl}>
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}