import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  getTournaments,
  createTournament,
} from "../api/tournamentApi";

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState([]);

  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateTournament = async () => {
    if (!name || !season) {
      alert("Enter tournament name and season");
      return;
    }

    try {
      await createTournament({
        name,
        season,
        startDate: startDate || null,
        endDate: endDate || null,
        active: true,
      });

      alert("Tournament Created");

      setName("");
      setSeason("");
      setStartDate("");
      setEndDate("");

      loadTournaments();
    } catch (error) {
      console.error(error);
      alert("Failed to create tournament");
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1>🏆 Tournaments</h1>
            <p style={{ color: "var(--text-secondary)" }}>Create and organize official seasons, leagues, or knockout tournaments.</p>
          </div>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>✨ Create New Tournament</h2>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "end" }}>
            <div className="form-group" style={{ flex: 2, minWidth: "220px", marginBottom: 0 }}>
              <label className="form-label">Tournament Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Premier League"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: "120px", marginBottom: 0 }}>
              <label className="form-label">Season / Year</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2026"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1.2, minWidth: "180px", marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="datetime-local"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1.2, minWidth: "180px", marginBottom: 0 }}>
              <label className="form-label">End Date</label>
              <input
                type="datetime-local"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" onClick={handleCreateTournament}>
              ➕ Create Tournament
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Active Leaguedom</span>
          <span className="badge badge-primary">{tournaments.length} Tournaments</span>
        </div>

        {tournaments.length === 0 ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No tournaments found. Initiate a new one above!</p>
          </div>
        ) : (
          <div className="grid-3">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "between", alignItems: "center" }}>
                  <span className="badge badge-primary" style={{ fontSize: "0.75rem" }}>
                    Season: {tournament.season}
                  </span>
                  <span className={`badge ${tournament.active ? "badge-success" : "badge-danger"}`} style={{ fontSize: "0.75rem" }}>
                    {tournament.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <h3 style={{ fontSize: "1.25rem", marginTop: "0.5rem" }}>{tournament.name}</h3>
                {tournament.startDate && (
                  <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span>📅 Starts: {new Date(tournament.startDate).toLocaleDateString()}</span>
                    {tournament.endDate && <span>🏁 Ends: {new Date(tournament.endDate).toLocaleDateString()}</span>}
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