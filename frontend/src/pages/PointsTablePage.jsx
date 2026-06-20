import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getPointsTable } from "../api/pointsTableApi";
import { getTournaments } from "../api/tournamentApi";

export default function PointsTablePage() {
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await getTournaments();
      setTournaments(data);
      if (data.length > 0) {
        setSelectedTournamentId(data[0].id);
        loadPointsTable(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load tournaments", error);
    }
  };

  const loadPointsTable = async (tournamentId) => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const data = await getPointsTable(tournamentId);
      // Sort rows: first by points (descending), then by wins (descending), then by netRunRate (descending)
      const sortedData = [...data].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.netRunRate - a.netRunRate;
      });
      setRows(sortedData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1>📊 Tournament Standings</h1>
          <p style={{ color: "var(--text-secondary)" }}>Official group standings and Net Run Rates (NRR).</p>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <div className="form-group" style={{ maxWidth: "350px", marginBottom: 0 }}>
            <label className="form-label">Select League / Tournament</label>
            <select
              className="form-select"
              value={selectedTournamentId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedTournamentId(id);
                loadPointsTable(id);
              }}
            >
              <option value="">Choose Tournament</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.season})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Standings Board</span>
          {rows.length > 0 && <span className="badge badge-primary">{rows.length} Teams</span>}
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <h3>Calculating Standings...</h3>
          </div>
        ) : !selectedTournamentId ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>Please choose a tournament from the dropdown selector above to see the standings.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No matches have been recorded or no teams added to this tournament yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th style={{ width: "80px", textAlign: "center" }}>Pos</th>
                  <th>Team</th>
                  <th style={{ textAlign: "center" }}>Played</th>
                  <th style={{ textAlign: "center" }}>Won</th>
                  <th style={{ textAlign: "center" }}>Lost</th>
                  <th style={{ textAlign: "center" }}>Tied</th>
                  <th style={{ textAlign: "center" }}>Points</th>
                  <th style={{ textAlign: "center" }}>Net Run Rate (NRR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const nrrValue = row.netRunRate || 0.0;
                  const isPositiveNrr = nrrValue >= 0;
                  return (
                    <tr key={row.id}>
                      <td style={{ textAlign: "center", fontWeight: "700", color: "var(--text-muted)" }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: "700" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "700" }}>
                            {row.team?.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{row.team?.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "600" }}>{row.matchesPlayed}</td>
                      <td style={{ textAlign: "center", color: "var(--success)" }}>{row.wins}</td>
                      <td style={{ textAlign: "center", color: "var(--danger)" }}>{row.losses}</td>
                      <td style={{ textAlign: "center" }}>{row.ties}</td>
                      <td style={{ textAlign: "center", fontWeight: "800", color: "var(--primary)", fontSize: "1.05rem" }}>
                        {row.points}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "700" }}>
                        <span className={`badge ${isPositiveNrr ? "badge-success" : "badge-danger"}`}>
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
    </div>
  );
}