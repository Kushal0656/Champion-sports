import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  getMatches,
  createMatch,
  completeMatch,
  updateMatch,
} from "../api/matchApi";
import { getTeams } from "../api/teamApi";
import { isAdminLoggedIn } from "../utils/auth";
import axiosClient from "../api/axiosClient";
import { getInnings } from "../api/inningsApi";
import { getTournaments } from "../api/tournamentApi";

export default function MatchesPage() {
  const loggedIn = isAdminLoggedIn();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [innings, setInnings] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [venue, setVenue] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [overs, setOvers] = useState(20);
  const [streamUrl, setStreamUrl] = useState("");
  const [tournamentId, setTournamentId] = useState("");

  // Odds edit states
  const [editingOddsMatchId, setEditingOddsMatchId] = useState(null);
  const [oddsTeamA, setOddsTeamA] = useState("");
  const [oddsTeamB, setOddsTeamB] = useState("");
  const [oddsDraw, setOddsDraw] = useState("");
  const [oddsBookmaker, setOddsBookmaker] = useState("");
  const [matchOddsData, setMatchOddsData] = useState({});

  // Odds API states
  const [apiEvents, setApiEvents] = useState([]);
  const [selectedApiEventId, setSelectedApiEventId] = useState("");
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [showApiSelector, setShowApiSelector] = useState(false);
  const [isCalculatingPerformance, setIsCalculatingPerformance] = useState(false);

  const handleFetchApiEvents = async () => {
    setIsFetchingApi(true);
    try {
      const response = await fetch(
        `https://api.odds-api.io/v3/events?sport=cricket&apiKey=6f92fa5b8e4de6fac35701a7bd2def125ea28bcbcc682d890e35418747178b25`
      );
      const data = await response.json();
      setApiEvents(data || []);
      setShowApiSelector(true);
    } catch (error) {
      console.error("Failed to fetch events from API", error);
      alert("Failed to load events from Odds API");
    } finally {
      setIsFetchingApi(false);
    }
  };

  const handleFetchOddsForEvent = async (eventId) => {
    if (!eventId) return;
    setIsFetchingApi(true);
    try {
      const response = await fetch(
        `https://api.odds-api.io/v3/odds?eventId=${eventId}&bookmakers=Bovada,Unibet&apiKey=6f92fa5b8e4de6fac35701a7bd2def125ea28bcbcc682d890e35418747178b25`
      );
      const data = await response.json();
      
      if (!data.bookmakers || Object.keys(data.bookmakers).length === 0) {
        alert("No active odds found for this match on Bovada or Unibet. Try entering manual odds.");
        return;
      }

      // Pick first available bookmaker
      const bookmakerName = Object.keys(data.bookmakers)[0];
      const markets = data.bookmakers[bookmakerName];
      const market = markets.find(m => m.name === "h2h" || m.name === "match_winner") || markets[0];
      
      if (market && market.odds && market.odds.length > 0) {
        const oddsItem = market.odds[0];
        setOddsTeamA(oddsItem.home || "1.90");
        setOddsTeamB(oddsItem.away || "1.90");
        setOddsDraw(oddsItem.draw || "4.00");
        setOddsBookmaker(oddsItem.home || "1.90"); // Default bookmaker odds to home/avg
        alert(`Successfully fetched odds from ${bookmakerName}!`);
      } else {
        alert("Could not find match winner odds for this match.");
      }
    } catch (error) {
      console.error("Failed to fetch odds for event", error);
      alert("Failed to load odds for the selected event");
    } finally {
      setIsFetchingApi(false);
    }
  };

  const handleOpenOddsConfig = async (matchId) => {
    try {
      const response = await axiosClient.get(`/admin/match-odds/${matchId}`);
      const data = response.data;
      setOddsTeamA(data.teamAOdds || "1.90");
      setOddsTeamB(data.teamBOdds || "1.90");
      setOddsDraw(data.drawOdds || "4.00");
      setOddsBookmaker(data.bookmakerOdds || "1.90");
      setEditingOddsMatchId(matchId);
      setShowApiSelector(false);
      setSelectedApiEventId("");
    } catch (error) {
      console.error("Failed to load odds", error);
      setOddsTeamA("1.90");
      setOddsTeamB("1.90");
      setOddsDraw("4.00");
      setOddsBookmaker("1.90");
      setEditingOddsMatchId(matchId);
      setShowApiSelector(false);
      setSelectedApiEventId("");
    }
  };

  const handleSaveOdds = async (matchId) => {
    try {
      await axiosClient.post(`/admin/match-odds/${matchId}`, {
        teamAOdds: parseFloat(oddsTeamA),
        teamBOdds: parseFloat(oddsTeamB),
        drawOdds: parseFloat(oddsDraw),
        bookmakerOdds: parseFloat(oddsBookmaker)
      });
      alert("Odds configured successfully!");
      setEditingOddsMatchId(null);
      loadMatches();
    } catch (error) {
      console.error("Failed to save odds", error);
      alert("Failed to save odds");
    }
  };

  const handleCalculatePerformanceOdds = async (matchId) => {
    setIsCalculatingPerformance(true);
    try {
      const response = await axiosClient.get(`/admin/match-odds/${matchId}/calculate`);
      const data = response.data;
      setOddsTeamA(data.teamAOdds);
      setOddsTeamB(data.teamBOdds);
      setOddsDraw(data.drawOdds);
      setOddsBookmaker(data.bookmakerOdds);
      alert("Automatically calculated odds based on team performance!");
    } catch (error) {
      console.error("Failed to calculate performance odds", error);
      alert("Failed to calculate performance-based odds");
    } finally {
      setIsCalculatingPerformance(false);
    }
  };

  useEffect(() => {
    loadMatches();
    loadTeams();
    loadInnings();
    loadTournaments();
  }, []);

  const loadMatches = async () => {
    try {
      const data = await getMatches();
      setMatches(data);

      const oddsMap = {};
      await Promise.all(
        data.map(async (m) => {
          try {
            const response = await axiosClient.get(`/admin/match-odds/${m.id}`);
            oddsMap[m.id] = response.data;
          } catch (e) {
            // Ignore if no odds set yet or API error
          }
        })
      );
      setMatchOddsData(oddsMap);
    } catch (error) {
      console.error("Error loading matches", error);
    }
  };

  const loadTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Error loading teams", error);
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

  const loadTournaments = async () => {
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch (error) {
      console.error("Error loading tournaments", error);
    }
  };

  const handleCreateMatch = async () => {
    if (!teamAId || !teamBId || !venue || !matchDate) {
      alert("Fill all fields");
      return;
    }

    if (teamAId === teamBId) {
      alert("Select different teams");
      return;
    }

    try {
      await createMatch({
        teamA: {
          id: Number(teamAId),
        },
        teamB: {
          id: Number(teamBId),
        },
        venue,
        matchDate,
        overs,
        streamUrl,
        tournament: tournamentId ? { id: Number(tournamentId) } : null,
      });

      alert("Match Created Successfully");

      setTeamAId("");
      setTeamBId("");
      setVenue("");
      setMatchDate("");
      setOvers(20);
      setStreamUrl("");
      setTournamentId("");

      loadMatches();
    } catch (error) {
      console.error(error);
      alert("Failed to create match");
    }
  };

  const handleCompleteMatch = async (matchId) => {
    try {
      await completeMatch(matchId);
      alert("Match Completed successfully");
      loadMatches();
      loadInnings();
    } catch (error) {
      console.error(error);
      alert("Failed to complete match");
    }
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

  const getTeamScore = (matchId, teamId) => {
    const teamInning = innings.find(
      (inn) => inn.match?.id === matchId && inn.battingTeam?.id === teamId
    );
    if (!teamInning) return null;
    return `${teamInning.runs}/${teamInning.wickets} (${teamInning.overs}.${teamInning.balls} ov)`;
  };

  const getMatchResultMargin = (match) => {
    if (match.resultMargin) return match.resultMargin;
    
    const matchInnings = innings.filter((inn) => inn.match?.id === match.id);
    if (matchInnings.length < 2) return "";
    
    matchInnings.sort((a, b) => a.inningsNumber - b.inningsNumber);
    const first = matchInnings[0];
    const second = matchInnings[1];
    
    if (second.runs > first.runs) {
      return `Won by ${10 - second.wickets} wickets`;
    } else if (first.runs > second.runs) {
      return `Won by ${first.runs - second.runs} runs`;
    } else {
      return "Match Tied";
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1>{loggedIn ? "🏆 Matches Management" : "📅 Matches Schedule & Fixtures"}</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {loggedIn 
              ? "Schedule matches, set parameters, and finalize completed results."
              : "Browse the schedule of upcoming tournaments and past match results."}
          </p>
        </div>

        {loggedIn && (
          <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>✨ Schedule New Match</h2>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "end" }}>
              <div className="form-group" style={{ flex: 1.5, minWidth: "200px", marginBottom: 0 }}>
                <label className="form-label">Team A</label>
                <select
                  className="form-select"
                  value={teamAId}
                  onChange={(e) => setTeamAId(e.target.value)}
                >
                  <option value="">Select Team A</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1.5, minWidth: "200px", marginBottom: 0 }}>
                <label className="form-label">Team B</label>
                <select
                  className="form-select"
                  value={teamBId}
                  onChange={(e) => setTeamBId(e.target.value)}
                >
                  <option value="">Select Team B</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1.5, minWidth: "180px", marginBottom: 0 }}>
                <label className="form-label">Venue</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Stadium / Location"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: 1.2, minWidth: "160px", marginBottom: 0 }}>
                <label className="form-label">Match Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: 0.8, minWidth: "90px", marginBottom: 0 }}>
                <label className="form-label">Overs</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="20"
                  value={overs}
                  onChange={(e) => setOvers(Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ flex: 1.5, minWidth: "180px", marginBottom: 0 }}>
                <label className="form-label">YouTube Stream URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://youtube.com/..."
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ flex: 1.5, minWidth: "180px", marginBottom: 0 }}>
                <label className="form-label">Tournament (Optional)</label>
                <select
                  className="form-select"
                  value={tournamentId}
                  onChange={(e) => setTournamentId(e.target.value)}
                >
                  <option value="">No Tournament</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.season})
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary" onClick={handleCreateMatch}>
                📅 Create Match
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Fixture List</span>
          <span className="badge badge-primary">{matches.length} Total Matches</span>
        </div>

        {matches.length === 0 ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No matches scheduled yet. Prepare a match above!</p>
          </div>
        ) : (
          <div className="grid-2">
            {matches.map((match) => (
              <div 
                key={match.id} 
                className="premium-card" 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  justifyContent: "space-between", 
                  gap: "1.25rem" 
                }}
              >
                <div style={{ display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    📍 {match.venue}
                  </span>
                  {getStatusBadge(match.status || "SCHEDULED")}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "between", padding: "0.5rem 0" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                    <div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", fontWeight: "700" }}>
                      {match.teamA?.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: "700", textAlign: "center", fontSize: "1.05rem" }}>{match.teamA?.name}</span>
                    {getTeamScore(match.id, match.teamA?.id) && (
                      <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--primary)" }}>
                        {getTeamScore(match.id, match.teamA?.id)}
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-muted)", padding: "0 1rem" }}>VS</span>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                    <div style={{ width: "45px", height: "45px", borderRadius: "50%", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", fontWeight: "700" }}>
                      {match.teamB?.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: "700", textAlign: "center", fontSize: "1.05rem" }}>{match.teamB?.name}</span>
                    {getTeamScore(match.id, match.teamB?.id) && (
                      <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--primary)" }}>
                        {getTeamScore(match.id, match.teamB?.id)}
                      </span>
                    )}
                  </div>
                </div>

                {/* YouTube Live Stream Configuration */}
                {loggedIn ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: "0.5rem 0", borderTop: "1px solid var(--border-light)" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>📺 YouTube Live Stream URL (Admin Only)</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: "0.45rem 0.75rem", fontSize: "0.85rem", marginBottom: 0 }}
                      placeholder="Paste YouTube stream URL"
                      defaultValue={match.streamUrl || ""}
                      onBlur={async (e) => {
                        const url = e.target.value;
                        if (url !== (match.streamUrl || "")) {
                          try {
                            await updateMatch(match.id, { ...match, streamUrl: url });
                            alert("Match stream URL updated successfully!");
                            loadMatches();
                          } catch (error) {
                            console.error(error);
                            alert("Failed to update match stream URL");
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  match.streamUrl && (
                    <div style={{ padding: "0.5rem 0", borderTop: "1px solid var(--border-light)", display: "flex" }}>
                      <a
                        href={match.streamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: "0.45rem 1rem", fontSize: "0.8rem", textDecoration: "none", width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                      >
                        📺 Watch Live Stream Broadcast
                      </a>
                    </div>
                  )
                )}
                {matchOddsData[match.id] && (
                  <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.8rem", padding: "0.6rem 0.75rem", backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", border: "1px solid var(--border-light)", color: "var(--text-secondary)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", gap: "0.25rem" }}>🎯 <b>Odds:</b> {match.teamA?.name || "Team A"}: <span style={{ color: "var(--primary)", fontWeight: "700" }}>{matchOddsData[match.id].teamAOdds}</span></span>
                    <span>•</span>
                    <span>{match.teamB?.name || "Team B"}: <span style={{ color: "var(--primary)", fontWeight: "700" }}>{matchOddsData[match.id].teamBOdds}</span></span>
                    {matchOddsData[match.id].drawOdds && (
                      <>
                        <span>•</span>
                        <span>Draw: <span style={{ color: "var(--text-muted)", fontWeight: "700" }}>{matchOddsData[match.id].drawOdds}</span></span>
                      </>
                    )}
                    {matchOddsData[match.id].bookmakerOdds && (
                      <>
                        <span>•</span>
                        <span>Bookmaker: <span style={{ color: "var(--success)", fontWeight: "700" }}>{matchOddsData[match.id].bookmakerOdds}</span></span>
                      </>
                    )}
                  </div>
                )}
                <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <span>📅 {new Date(match.matchDate).toLocaleString()}</span>
                    <span>⚾ Overs limit: {match.overs}</span>
                    {match.winner && (
                      <span style={{ fontWeight: "700", color: "var(--success)" }}>
                        🏆 Winner: {match.winner.name} ({getMatchResultMargin(match)})
                      </span>
                    )}
                    {!match.winner && match.status === "COMPLETED" && (
                      <span style={{ fontWeight: "700", color: "var(--text-secondary)" }}>
                        🏁 Result: {getMatchResultMargin(match)}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {match.status === "COMPLETED" && (
                      <a
                        href={`/scorecard?matchId=${match.id}`}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", textDecoration: "none" }}
                        title="View all innings of this match"
                      >
                        ℹ️ Info
                      </a>
                    )}
                    {loggedIn && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        onClick={() => handleOpenOddsConfig(match.id)}
                      >
                        🎯 Configure Odds
                      </button>
                    )}
                    {loggedIn && match.status !== "COMPLETED" && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                        onClick={() => handleCompleteMatch(match.id)}
                      >
                        🏁 End Match
                      </button>
                    )}
                  </div>
                </div>

                {editingOddsMatchId === match.id && (
                  <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <h4 style={{ margin: 0, fontSize: "0.9rem" }}>🎯 Configure Match & Bookmaker Odds</h4>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          onClick={() => handleCalculatePerformanceOdds(match.id)}
                          disabled={isCalculatingPerformance}
                        >
                          {isCalculatingPerformance ? "⏳ Calculating..." : "📊 Auto-Calculate (Performance)"}
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          onClick={handleFetchApiEvents}
                          disabled={isFetchingApi}
                        >
                          {isFetchingApi ? "⏳ Fetching..." : "🔍 Auto-Fetch (Odds API)"}
                        </button>
                      </div>
                    </div>

                    {showApiSelector && (
                      <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "var(--primary-light)", borderRadius: "6px" }}>
                        <label className="form-label" style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: "600", marginBottom: "0.25rem", display: "block" }}>Select Game from Odds-API.io</label>
                        <select 
                          className="form-select" 
                          style={{ fontSize: "0.8rem", padding: "0.4rem 0.60rem" }}
                          value={selectedApiEventId}
                          onChange={(e) => {
                            setSelectedApiEventId(e.target.value);
                            handleFetchOddsForEvent(e.target.value);
                          }}
                        >
                          <option value="">-- Choose matching game --</option>
                          {apiEvents.map((evt) => (
                            <option key={evt.id} value={evt.id}>
                              {evt.home} vs {evt.away} ({evt.league?.name || "Cricket"})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Team A Odds</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={oddsTeamA}
                          onChange={(e) => setOddsTeamA(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Team B Odds</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={oddsTeamB}
                          onChange={(e) => setOddsTeamB(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Draw Odds</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={oddsDraw}
                          onChange={(e) => setOddsDraw(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Bookmaker Odds</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={oddsBookmaker}
                          onChange={(e) => setOddsBookmaker(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "end", gap: "0.5rem" }}>
                      <button className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }} onClick={() => setEditingOddsMatchId(null)}>
                        Cancel
                      </button>
                      <button className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }} onClick={() => handleSaveOdds(match.id)}>
                        Save Odds
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}