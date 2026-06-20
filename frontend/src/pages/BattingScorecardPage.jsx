import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getInnings } from "../api/inningsApi";
import { getBattingStats } from "../api/battingStatsApi";

export default function BattingScorecardPage() {
  const [innings, setInnings] = useState([]);
  const [inningsId, setInningsId] = useState("");
  const [stats, setStats] = useState([]);

  useEffect(() => {
    loadInnings();
  }, []);

  const loadInnings = async () => {
    const data = await getInnings();
    setInnings(data);
    if (data.length > 0) {
      setInningsId(data[0].id);
      loadScorecard(data[0].id);
    }
  };

  const loadScorecard = async (selectedInningsId) => {
    try {
      const data = await getBattingStats(selectedInningsId);
      setStats(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1>🏏 Batting Scorecard</h1>
          <p style={{ color: "var(--text-secondary)" }}>View specific batting statistics per innings.</p>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <div className="form-group" style={{ maxWidth: "350px", marginBottom: 0 }}>
            <label className="form-label">Select Active Innings</label>
            <select
              className="form-select"
              value={inningsId}
              onChange={(e) => {
                const id = e.target.value;
                setInningsId(id);
                if (id) {
                  loadScorecard(id);
                } else {
                  setStats([]);
                }
              }}
            >
              <option value="">Select Innings</option>
              {innings.map((inning) => (
                <option key={inning.id} value={inning.id}>
                  {inning.match?.teamA?.name} vs {inning.match?.teamB?.name} - {inning.battingTeam?.name} Innings #{inning.inningsNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        {inningsId ? (
          <div className="premium-card" style={{ padding: "1.5rem" }}>
            <div className="table-container" style={{ marginTop: 0 }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Batsman</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Runs</th>
                    <th style={{ width: "100px", textAlign: "center" }}>Balls</th>
                    <th style={{ width: "80px", textAlign: "center" }}>4s</th>
                    <th style={{ width: "80px", textAlign: "center" }}>6s</th>
                    <th style={{ width: "160px", textAlign: "center" }}>Dismissal</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                        No stats available for this innings yet.
                      </td>
                    </tr>
                  ) : (
                    stats.map((stat) => (
                      <tr key={stat.id}>
                        <td style={{ fontWeight: "700" }}>{stat.player?.name}</td>
                        <td style={{ textAlign: "center", fontWeight: "800", color: "var(--text-primary)" }}>{stat.runs}</td>
                        <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{stat.balls}</td>
                        <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{stat.fours}</td>
                        <td style={{ textAlign: "center", color: "var(--text-secondary)" }}>{stat.sixes}</td>
                        <td style={{ textAlign: "center" }}>
                          {stat.out ? (
                            <span className="badge badge-danger">{stat.dismissalType || "Out"}</span>
                          ) : (
                            <span className="badge badge-success">Not Out</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>Select an innings above to view the detailed batting metrics.</p>
          </div>
        )}
      </div>
    </div>
  );
}