import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { getPlayers, createPlayer, uploadPlayerPhoto } from "../api/playerApi";
import { getFullUrl } from "../utils/config";

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await getPlayers();
      setPlayers(data);
    } catch (error) {
      console.error("Error loading players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = async () => {
    if (!name.trim()) {
      alert("Player name is required");
      return;
    }

    try {
      const player = await createPlayer({
        name,
        role: role || null,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
      });

      if (photoFile) {
        try {
          await uploadPlayerPhoto(player.id, photoFile);
        } catch (photoErr) {
          console.error("Failed to upload player photo:", photoErr);
        }
      }

      setName("");
      setRole("");
      setJerseyNumber("");
      setPhotoFile(null);

      loadPlayers();

      alert("Player created successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to create player");
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1>👤 Players Management</h1>
            <p style={{ color: "var(--text-secondary)" }}>Register and manage cricket players and their profiles.</p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn btn-secondary" onClick={loadPlayers}>
              🔄 Refresh List
            </button>
          </div>
        </div>

        <div className="premium-card" style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1.25rem" }}>✨ Register New Player</h2>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "end" }}>
            <div className="form-group" style={{ flex: 2, minWidth: "220px", marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Player Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: "180px", marginBottom: 0 }}>
              <label className="form-label">Playing Role</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">Select Role</option>
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All Rounder">All Rounder</option>
                <option value="Wicket Keeper">Wicket Keeper</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1, minWidth: "120px", marginBottom: 0 }}>
              <label className="form-label">Jersey Number</label>
              <input
                type="number"
                className="form-input"
                placeholder="Number"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ flex: 1.5, minWidth: "180px", marginBottom: 0 }}>
              <label className="form-label">Player Photo</label>
              <input
                key={photoFile ? photoFile.name : "empty"}
                type="file"
                accept="image/*"
                className="form-input"
                style={{ padding: "0.38rem" }}
                onChange={(e) => setPhotoFile(e.target.files[0])}
              />
            </div>

            <button className="btn btn-primary" onClick={handleCreatePlayer}>
              ➕ Add Player
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>Roster List</span>
          <span className="badge badge-success">{players.length} Registered</span>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <h3>Loading players...</h3>
          </div>
        ) : players.length === 0 ? (
          <div className="premium-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <p>No players found. Register a player to fill the roster!</p>
          </div>
        ) : (
          <div className="grid-3">
            {players.map((player) => (
              <div key={player.id} className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ position: "relative", width: "55px", height: "55px", flexShrink: 0 }}>
                    {player.photoUrl ? (
                      <img src={getFullUrl(player.photoUrl)} alt={player.name} style={{ width: "55px", height: "55px", borderRadius: "12px", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "55px", height: "55px", borderRadius: "12px", backgroundColor: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: "700" }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <label style={{ position: "absolute", bottom: -2, right: -2, backgroundColor: "var(--primary)", color: "white", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} title="Update Photo">
                      📷
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          if (e.target.files[0]) {
                            try {
                              await uploadPlayerPhoto(player.id, e.target.files[0]);
                              loadPlayers();
                              alert("Photo updated successfully!");
                            } catch (err) {
                              console.error(err);
                              alert("Failed to update photo");
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "1.15rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</h3>
                    <span className="badge badge-primary" style={{ fontSize: "0.7rem", marginTop: "0.25rem", display: "inline-block" }}>
                      {player.role || "Unassigned"}
                    </span>
                  </div>
                  {player.jerseyNumber && (
                    <span style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--primary)", marginLeft: "auto", flexShrink: 0 }}>
                      #{player.jerseyNumber}
                    </span>
                  )}
                </div>
                <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Current Team</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                    {player.team?.name || "Free Agent"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}