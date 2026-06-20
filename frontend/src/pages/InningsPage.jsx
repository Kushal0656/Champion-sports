import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getMatches } from "../api/matchApi";
import {
  getInnings,
  createInnings,
} from "../api/inningsApi";

export default function InningsPage() {
  const [matches, setMatches] = useState([]);
  const [innings, setInnings] = useState([]);
  const [matchId, setMatchId] = useState("");
  const [inningsNumber, setInningsNumber] = useState(1);

  useEffect(() => {
    loadMatches();
    loadInnings();
  }, []);

  const loadMatches = async () => {
    const data = await getMatches();
    setMatches(data);
  };

  const loadInnings = async () => {
    const data = await getInnings();
    setInnings(data);
  };

  const handleCreateInnings = async () => {
    const match = matches.find((m) => m.id === Number(matchId));

    if (!match) {
      alert("Select Match");
      return;
    }

    try {
      // Find out batting & bowling team based on innings number.
      // Usually, Innings 1 is Team A batting, Innings 2 is Team B batting (or toss-based).
      // We will default Innings 1 to Team A batting, and Innings 2 to Team B batting for ease.
      const battingTeam = inningsNumber === 1 ? match.teamA : match.teamB;
      const bowlingTeam = inningsNumber === 1 ? match.teamB : match.teamA;

      await createInnings({
        match: {
          id: match.id,
        },
        battingTeam: {
          id: battingTeam.id,
        },
        bowlingTeam: {
          id: bowlingTeam.id,
        },
        inningsNumber,
      });

      alert("Innings Created successfully");
      setMatchId("");
      loadInnings();
    } catch (error) {
      console.error(error);
      alert("Failed to create innings");
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1>🏏 Innings Management</h1>
          <p style={{ color: "var(--text-secondary)" }}>Create and initialize innings records for scheduled or live matches.</p>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>✨ Initialize Innings</h2>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "end" }}>
            <div className="form-group" style={{ flex: 2, minWidth: "250px", marginBottom: 0 }}>
              <label className="form-label">Select Match</label>
              <select
                className="form-select"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
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

            <div className="form-group" style={{ flex: 1, minWidth: "150px", marginBottom: 0 }}>
              <label className="form-label">Innings Number</label>
              <select
                className="form-select"
                value={inningsNumber}
                onChange={(e) => setInningsNumber(Number(e.target.value))}
              >
                <option value={1}>Innings 1</option>
                <option value={2}>Innings 2</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleCreateInnings}>
              🏏 Start Innings
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Active Scorecards</span>
          <span className="badge badge-primary">{innings.length} Innings Records</span>
        </div>

        {innings.length === 0 ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No active innings records. Start one above!</p>
          </div>
        ) : (
          <div className="grid-3">
            {innings.map((inning) => (
              <div key={inning.id} className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                    Innings {inning.inningsNumber}
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: "0.75rem" }}>
                    Match #{inning.match?.id}
                  </span>
                </div>
                
                <h3 style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>{inning.battingTeam?.name}</h3>
                
                <div style={{ display: "flex", justifyContent: "between", alignItems: "end", borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Runs / Wickets</span>
                    <span style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--primary)" }}>
                      {inning.runs}/{inning.wickets}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", textAlign: "right" }}>Overs</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-secondary)" }}>
                      {inning.overs}.{inning.balls}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}