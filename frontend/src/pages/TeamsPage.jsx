import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getTeams, createTeam, uploadTeamLogo, updateTeam } from "../api/teamApi";
import { getPlayers, assignPlayerTeam, removePlayerTeam } from "../api/playerApi";
import { getApiBaseUrl, getFullUrl } from "../utils/config";
import { isAdminLoggedIn } from "../utils/auth";

export default function TeamsPage() {
  const loggedIn = isAdminLoggedIn();
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [teamLeader, setTeamLeader] = useState("");
  const [editTeamLeader, setEditTeamLeader] = useState("");
  const [savingTeamLeader, setSavingTeamLeader] = useState(false);
  const [teamLogoFile, setTeamLogoFile] = useState(null);
  const [teamLogoPreview, setTeamLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [searchJersey, setSearchJersey] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState(null);
  const [playerToAdd, setPlayerToAdd] = useState(null);

  const loadTeamPlayers = async (teamId) => {
    try {
      const data = await getPlayers({ teamId });
      setTeamPlayers(data);
    } catch (err) {
      console.error("Error loading team players:", err);
    }
  };

  const handleOpenTeamDetails = (team) => {
    setSelectedTeam(team);
    setEditTeamLeader(team.teamLeader || "");
    loadTeamPlayers(team.id);
  };
  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeamLogoFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => setTeamLogoPreview(evt.target.result);
    reader.readAsDataURL(file);
  };


  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTeam) return;
    try {
      await uploadTeamLogo(selectedTeam.id, file);
      loadTeams();
      setSelectedTeam({
        ...selectedTeam,
        logoUrl: `${getApiBaseUrl()}/api/teams/${selectedTeam.id}/logo?t=${Date.now()}`
      });
      alert("Logo uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload logo");
    }
  };

  const handleJerseySearch = async () => {
    if (!searchJersey.trim()) {
      alert("Please enter a jersey number");
      return;
    }
    try {
      setSearchLoading(true);
      const data = await getPlayers({ jerseyNumber: Number(searchJersey) });
      setSearchResults(data);
    } catch (err) {
      console.error(err);
      alert("Search failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAssignPlayer = async (player) => {
    try {
      await assignPlayerTeam(player.id, selectedTeam.id);
      alert("Player added to team successfully!");
      setPlayerToAdd(null);
      loadTeamPlayers(selectedTeam.id);
      setSearchJersey("");
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      alert("Failed to add player to team");
    }
  };

  const handleRemovePlayer = async (player) => {
    try {
      await removePlayerTeam(player.id);
      alert("Player removed from team successfully!");
      setPlayerToRemove(null);
      loadTeamPlayers(selectedTeam.id);
    } catch (err) {
      console.error(err);
      alert("Failed to remove player from team");
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await getTeams();
      setTeams(data);
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      alert("Enter team name");
      return;
    }
    try {
      setCreating(true);
      await createTeam(teamName.trim(), teamLogoFile, teamLeader.trim());
      setTeamName("");
      setTeamLeader("");
      setTeamLogoFile(null);
      setTeamLogoPreview(null);
      const fileInput = document.getElementById("team-logo-input");
      if (fileInput) fileInput.value = "";
      loadTeams();
      alert("Team created successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTeamLeader = async () => {
    if (!selectedTeam) return;
    try {
      setSavingTeamLeader(true);
      const updated = await updateTeam(selectedTeam.id, {
        ...selectedTeam,
        teamLeader: editTeamLeader.trim()
      });
      setSelectedTeam(updated);
      loadTeams();
      alert("Team leader updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update team leader");
    } finally {
      setSavingTeamLeader(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>{loggedIn ? "🏏 Teams Management" : "🏏 Teams & Roster"}</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              {loggedIn ? "Create and coordinate squads for tournaments." : "View team rosters and squad details."}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn btn-secondary" onClick={loadTeams}>
              🔄 Refresh List
            </button>
          </div>
        </div>

        {/* Create New Team */}
        {loggedIn && (
          <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>✨ Create New Team</h2>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>

              {/* Logo upload zone */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                <label
                  htmlFor="team-logo-input"
                  style={{
                    width: "100px", height: "100px", borderRadius: "16px",
                    border: "2px dashed var(--primary)",
                    background: "rgba(99,102,241,0.06)",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", overflow: "hidden", transition: "border-color 0.2s",
                    position: "relative"
                  }}
                  title="Click to upload team logo"
                >
                  {teamLogoPreview ? (
                    <img src={teamLogoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
                  ) : (
                    <>
                      <span style={{ fontSize: "2rem" }}>🏷️</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", padding: "0 6px", marginTop: "4px" }}>Upload Logo</span>
                    </>
                  )}
                  <input
                    id="team-logo-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleLogoFileChange}
                  />
                </label>
                {teamLogoPreview && (
                  <button
                    style={{ fontSize: "0.75rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onClick={() => { setTeamLogoFile(null); setTeamLogoPreview(null); const fi = document.getElementById("team-logo-input"); if (fi) fi.value = ""; }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {/* Name + submit */}
              <div style={{ flex: 1, minWidth: "220px", display: "flex", flexDirection: "column", gap: "1rem", justifyContent: "center" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Team Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Royal Challengers"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Team Leader Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={teamLeader}
                    onChange={(e) => setTeamLeader(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleCreateTeam}
                  disabled={creating}
                  style={{ alignSelf: "flex-start", minWidth: "140px" }}
                >
                  {creating ? "Creating..." : "➕ Create Team"}
                </button>
              </div>

            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Squads Directory</span>
          <span className="badge badge-primary">{teams.length} Teams</span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <h3>Loading teams...</h3>
          </div>
        ) : teams.length === 0 ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No teams found. Get started by creating one above!</p>
          </div>
        ) : (
          <div className="grid-3">
            {teams.map((team) => (
              <div
                key={team.id}
                className="premium-card"
                style={{ display: "flex", flexDirection: "column", gap: "0.75rem", cursor: "pointer", transition: "transform 0.2s" }}
                onClick={() => handleOpenTeamDetails(team)}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {team.logoUrl ? (
                    <img src={getFullUrl(team.logoUrl)} alt={team.name} style={{ width: "45px", height: "45px", borderRadius: "12px", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "45px", height: "45px", borderRadius: "12px", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: "700" }}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: "1.15rem", margin: 0 }}>{team.name}</h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>ID: #{team.id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTeam && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div className="premium-card" style={{
            width: "90%",
            maxWidth: "600px",
            maxHeight: "85vh",
            overflowY: "auto",
            padding: "2rem",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <button
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--text-muted)"
              }}
              onClick={() => {
                setSelectedTeam(null);
                setSearchResults([]);
                setSearchJersey("");
                setPlayerToRemove(null);
                setPlayerToAdd(null);
              }}
            >
              ✕
            </button>

            {/* Header info */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "1.5rem" }}>
              <div style={{ position: "relative", width: "75px", height: "75px", flexShrink: 0 }}>
                {selectedTeam.logoUrl ? (
                  <img src={getFullUrl(selectedTeam.logoUrl)} alt={selectedTeam.name} style={{ width: "75px", height: "75px", borderRadius: "12px", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "75px", height: "75px", borderRadius: "12px", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "700" }}>
                    {selectedTeam.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {loggedIn && (
                  <label style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: "var(--primary)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.8rem", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} title="Upload Logo">
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleLogoUpload}
                    />
                  </label>
                )}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.75rem" }}>{selectedTeam.name}</h2>
                <p style={{ color: "var(--text-secondary)", margin: "0.25rem 0 0 0" }}>
                  {loggedIn ? "Team Management & Roster" : "Team Squad & Details"}
                </p>
              </div>
            </div>

            {/* Team Leader Section */}
            <div style={{
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              padding: "1rem 1.25rem",
              borderRadius: "12px",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>👑</span>
                    <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)", fontWeight: "700" }}>Team Leader</span>
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-light)", marginTop: "0.25rem" }}>
                    {selectedTeam.teamLeader || <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontWeight: "400", fontSize: "1.1rem" }}>No Team Leader Assigned</span>}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                    Role: <span style={{ color: "var(--primary)", fontWeight: "600" }}>Team Leader</span>
                  </div>
                </div>
                
                {loggedIn && (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.9rem", margin: 0, width: "160px" }}
                      placeholder="Team Leader Name"
                      value={editTeamLeader}
                      onChange={(e) => setEditTeamLeader(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      style={{ padding: "0.4rem 1rem", fontSize: "0.9rem" }}
                      onClick={handleUpdateTeamLeader}
                      disabled={savingTeamLeader}
                    >
                      {savingTeamLeader ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Main Tabs/Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Roster Listing */}
              <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>👥 Squad Roster</span>
                  <span className="badge badge-success">{teamPlayers.length} Players</span>
                </h3>
                {teamPlayers.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>No players assigned to this team yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "180px", overflowY: "auto", paddingRight: "0.5rem" }}>
                    {teamPlayers.map(player => (
                      <div key={player.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "rgba(255, 255, 255, 0.03)", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                        {player.photoUrl ? (
                          <img src={getFullUrl(player.photoUrl)} alt={player.name} style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: "700" }}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{player.name}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>({player.role || "No Role"})</span>
                        </div>
                        {player.jerseyNumber && (
                          <span style={{ fontWeight: "800", color: "var(--primary)", fontSize: "0.9rem", marginRight: "0.5rem" }}>#{player.jerseyNumber}</span>
                        )}
                        {loggedIn && (
                          playerToRemove?.id === player.id ? (
                            <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: "600" }}>Confirm?</span>
                              <button
                                className="btn btn-primary"
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", backgroundColor: "#ef4444", borderColor: "#ef4444" }}
                                onClick={(e) => { e.stopPropagation(); handleRemovePlayer(player); }}
                              >
                                Yes
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                                onClick={(e) => { e.stopPropagation(); setPlayerToRemove(null); }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem", color: "#ef4444", borderColor: "#fecaca" }}
                              onClick={(e) => { e.stopPropagation(); setPlayerToRemove(player); }}
                            >
                              Remove
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Player by Jersey search */}
              {loggedIn && (
                <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1.25rem" }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>🔍 Add Player by Jersey</h3>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Enter Jersey Number (e.g. 7)"
                      value={searchJersey}
                      onChange={(e) => setSearchJersey(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn-primary" onClick={handleJerseySearch} disabled={searchLoading}>
                      {searchLoading ? "Searching..." : "Search"}
                    </button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: "1rem", border: "1px solid var(--border-light)", borderRadius: "8px", overflow: "hidden" }}>
                      <div style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", padding: "0.5rem 0.75rem", fontSize: "0.85rem", fontWeight: "600", borderBottom: "1px solid var(--border-light)" }}>
                        Search Results ({searchResults.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", maxHeight: "150px", overflowY: "auto" }}>
                        {searchResults.map(player => (
                          <div key={player.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border-light)" }}>
                            {player.photoUrl ? (
                              <img src={getFullUrl(player.photoUrl)} alt={player.name} style={{ width: "30px", height: "30px", borderRadius: "8px", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "30px", height: "30px", borderRadius: "8px", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: "700" }}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{player.name}</span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                Current: {player.team ? player.team.name : "Free Agent"}
                              </span>
                            </div>
                            playerToAdd?.id === player.id ? (
                              <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "600" }}>Confirm?</span>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem", backgroundColor: "var(--primary)" }}
                                  onClick={(e) => { e.stopPropagation(); handleAssignPlayer(player); }}
                                >
                                  Yes
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }}
                                  onClick={(e) => { e.stopPropagation(); setPlayerToAdd(null); }}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button className="btn btn-primary" style={{ padding: "0.2rem 0.6rem", fontSize: "0.8rem" }} onClick={(e) => { e.stopPropagation(); setPlayerToAdd(player); }}>
                                Add to Team
                              </button>
                            )
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.length === 0 && searchJersey && !searchLoading && (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>No matching players found with jersey #{searchJersey}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}