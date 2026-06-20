import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getTeams } from "../api/teamApi";
import { getTournaments } from "../api/tournamentApi";
import {
  addTeamToTournament,
  getTournamentTeams,
} from "../api/tournamentTeamApi";

export default function TournamentTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [tournamentTeams, setTournamentTeams] = useState([]);

  useEffect(() => {
    loadTeams();
    loadTournaments();
  }, []);

  const loadTeams = async () => {
    const data = await getTeams();
    setTeams(data);
  };

  const loadTournaments = async () => {
    const data = await getTournaments();
    setTournaments(data);
  };

  const loadTournamentTeams = async (tournamentId) => {
    const data = await getTournamentTeams(tournamentId);
    setTournamentTeams(data);
  };

  const handleAddTeam = async () => {
    if (!selectedTournament || !selectedTeam) {
      alert("Select Tournament and Team");
      return;
    }

    try {
      await addTeamToTournament(selectedTournament, selectedTeam);
      alert("Team added to tournament successfully");
      setSelectedTeam("");
      loadTournamentTeams(selectedTournament);
    } catch (error) {
      console.error(error);
      alert("Failed to add team to tournament");
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ marginBottom: "2rem" }}>
          <h1>🏆 Tournament Teams</h1>
          <p style={{ color: "var(--text-secondary)" }}>Assign teams to specific tournaments to structure the group stages and schedules.</p>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>✨ Add Team to Tournament</h2>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "end" }}>
            <div className="form-group" style={{ flex: 1.5, minWidth: "220px", marginBottom: 0 }}>
              <label className="form-label">Select Tournament</label>
              <select
                className="form-select"
                value={selectedTournament}
                onChange={(e) => {
                  setSelectedTournament(e.target.value);
                  loadTournamentTeams(e.target.value);
                }}
              >
                <option value="">Choose Tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name} ({tournament.season})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1.5, minWidth: "220px", marginBottom: 0 }}>
              <label className="form-label">Select Team</label>
              <select
                className="form-select"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Choose Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleAddTeam}>
              ➕ Add Team
            </button>
          </div>
        </div>

        <div className="premium-card">
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
            Participating Teams
          </h2>
          
          {!selectedTournament ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>Please select a tournament above to view its registered teams.</p>
          ) : tournamentTeams.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>No teams have been added to this tournament yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
              {tournamentTeams.map((entry) => (
                <div 
                  key={entry.id} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "between", 
                    padding: "1rem 1.25rem", 
                    border: "1px solid var(--border-light)", 
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "#f8fafc"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: "700" }}>
                      {entry.team?.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: "600", fontSize: "1rem" }}>{entry.team?.name}</span>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>Registered</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}