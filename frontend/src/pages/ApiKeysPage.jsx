import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import axiosClient from "../api/axiosClient";
import { getApiBaseUrl } from "../utils/config";

const ALL_APIS = [
  { value: "EVENTS", label: "Matches (EVENTS)", path: "/api/v1/get/events/1" },
  { value: "SERIES", label: "Series (SERIES)", path: "/api/v1/get/series/1" },
  { value: "BOOKMAKER", label: "Bookmaker Odds (BOOKMAKER)", path: "/api/v1/get/bookmaker/1" },
  { value: "ODDS", label: "Match Odds (ODDS)", path: "/api/v1/get/odds/1" },
  { value: "SESSIONS", label: "Sessions (SESSIONS)", path: "/api/v1/get/sessions/1" },
  { value: "SESSION_RESULT", label: "Session Results (SESSION_RESULT)", path: "/api/v1/result/session_result?eventId=1" },
  { value: "TV", label: "Live TV (TV)", path: "/api/v1/get/tv?eventId=1" },
  { value: "SCORE", label: "Scorecard (SCORE)", path: "/api/v1/get/score?eventId=1" },
  { value: "TOSS", label: "Toss Market (TOSS)", path: "/api/v1/get/toss/1" },
  { value: "TIED", label: "Tied Market (TIED)", path: "/api/v1/get/tied/1" }
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get("/admin/developer-keys");
      setKeys(response.data);
    } catch (error) {
      console.error("Failed to load developer keys", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      setLoading(true);
      await axiosClient.post(`/admin/developer-keys?name=${encodeURIComponent(newKeyName.trim())}`);
      setNewKeyName("");
      loadKeys();
    } catch (error) {
      console.error("Failed to generate key", error);
      alert("Failed to generate key");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKey = async (id) => {
    try {
      await axiosClient.put(`/admin/developer-keys/${id}/toggle`);
      loadKeys();
    } catch (error) {
      console.error("Failed to toggle key status", error);
      alert("Failed to toggle key status");
    }
  };

  const updatePermissions = async (id, permissions) => {
    try {
      await axiosClient.put(`/admin/developer-keys/${id}/permissions`, permissions);
      loadKeys();
    } catch (error) {
      console.error("Failed to update API permissions", error);
      alert("Failed to update API permissions");
    }
  };

  const handleTogglePermission = async (key, permission) => {
    const currentList = key.allowedApis ? key.allowedApis.split(",") : [];
    let updated;
    if (currentList.includes(permission)) {
      updated = currentList.filter(p => p !== permission);
    } else {
      updated = [...currentList, permission];
    }
    await updatePermissions(key.id, updated);
  };

  const handleSelectAllPermissions = async (key) => {
    const all = ALL_APIS.map(a => a.value);
    await updatePermissions(key.id, all);
  };

  const handleClearAllPermissions = async (key) => {
    await updatePermissions(key.id, []);
  };

  const handleDeleteKey = async (id) => {
    if (!confirm("Are you sure you want to delete/revoke this key? All active streams using these parameters will be blocked immediately.")) return;
    try {
      await axiosClient.delete(`/admin/developer-keys/${id}`);
      loadKeys();
    } catch (error) {
      console.error("Failed to delete key", error);
      alert("Failed to delete key");
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const getClientLinks = (k) => {
    const allowedList = k.allowedApis ? k.allowedApis.split(",") : [];
    return ALL_APIS.filter(api => allowedList.includes(api.value)).map(api => {
      const isPhpLegacy = api.path.includes(".php");
      const connector = isPhpLegacy ? "&" : "?";
      return {
        label: api.label,
        url: `${apiBaseUrl}${api.path}${connector}clientId=${k.clientId}&token=${k.token}`
      };
    });
  };

  const copyAllLinks = (k) => {
    const links = getClientLinks(k);
    if (links.length === 0) {
      alert("No active API permissions to copy!");
      return;
    }
    const block = links.map(item => `${item.label}:\n${item.url}`).join("\n\n");
    navigator.clipboard.writeText(block);
    setCopiedId(`all_${k.id}`);
    setTimeout(() => setCopiedId(""), 2000);
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <div style={{ marginBottom: "2rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "1.25rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800" }}>🔑 Developer Access & API Keys</h1>
          <p style={{ color: "var(--text-secondary)", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
            Generate client credentials, toggle endpoint-level permissions, and retrieve copyable feed integrations.
          </p>
        </div>

        <div className="grid-2" style={{ gap: "2rem", marginBottom: "2.5rem", alignItems: "start" }}>
          {/* Create Key Card */}
          <div className="premium-card" style={{ padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ✨ Generate New Credentials
            </h2>
            <form onSubmit={handleGenerateKey} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Client Name / Application</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. OBS Scoreboard Overlay, Fan Ticker"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
                <small style={{ display: "block", marginTop: "0.4rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  Provide a recognizable name to track usage of these credentials.
                </small>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.6rem" }} disabled={loading}>
                Generate Keypair
              </button>
            </form>
          </div>

          {/* Guidelines Card */}
          <div className="premium-card" style={{ padding: "1.75rem" }}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>💡 Integration Guide</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
              Use the generated **Client ID** and **Token** parameters to authenticate requests. Authentications can be made by either:
            </p>
            <ul style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0.5rem 0 0 0", paddingLeft: "1.25rem", lineHeight: "1.6" }}>
              <li>Passing query parameters: `?clientId=client_xxx&token=tok_yyy`</li>
              <li>Setting HTTP headers: `X-Client-Id` and `X-Token` (or `X-API-Key`)</li>
            </ul>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
              ⚠️ Clients can only query the specific APIs checked under their permissions row in the table below.
            </p>
          </div>
        </div>

        {/* Existing Keys Table */}
        <div className="premium-card" style={{ padding: "1.75rem", marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "1.25rem" }}>📋 Active Credentials</h2>
          {loading && keys.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading API keys...</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", border: "1px dashed var(--border-light)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No API keys generated yet. Use the generator above to create credentials.
            </div>
          ) : (
            <div className="table-container" style={{ margin: 0, overflowX: "auto" }}>
              <table className="premium-table" style={{ fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th>Application Name</th>
                    <th>Client ID</th>
                    <th>Token (Secret)</th>
                    <th style={{ minWidth: "300px" }}>API Access Permissions</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: "700" }}>{k.name}</td>
                      <td>
                        <code style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-app)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                          {k.clientId}
                        </code>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.15rem 0.35rem", fontSize: "0.7rem", marginLeft: "0.5rem" }}
                          onClick={() => copyToClipboard(k.clientId, `cid_${k.id}`)}
                        >
                          {copiedId === `cid_${k.id}` ? "Copied!" : "📋"}
                        </button>
                      </td>
                      <td>
                        <code style={{ fontSize: "0.75rem", backgroundColor: "var(--bg-app)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                          {k.token}
                        </code>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: "0.15rem 0.35rem", fontSize: "0.7rem", marginLeft: "0.5rem" }}
                          onClick={() => copyToClipboard(k.token, `tok_${k.id}`)}
                        >
                          {copiedId === `tok_${k.id}` ? "Copied!" : "📋"}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "0.2rem 0.4rem", fontSize: "0.7rem" }}
                              onClick={() => handleSelectAllPermissions(k)}
                            >
                              Select All
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "0.2rem 0.4rem", fontSize: "0.7rem", color: "var(--danger)" }}
                              onClick={() => handleClearAllPermissions(k)}
                            >
                              Clear All
                            </button>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.35rem", marginTop: "0.25rem" }}>
                            {ALL_APIS.map((api) => {
                              const allowedList = k.allowedApis ? k.allowedApis.split(",") : [];
                              const isChecked = allowedList.includes(api.value);
                              return (
                                <label
                                  key={`${k.id}_${api.value}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    fontSize: "0.72rem",
                                    cursor: "pointer",
                                    color: isChecked ? "var(--text-primary)" : "var(--text-muted)"
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(k, api.value)}
                                    style={{ cursor: "pointer" }}
                                  />
                                  {api.label.split(" (")[0]}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`badge ${k.active ? "badge-success" : "badge-danger"}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => handleToggleKey(k.id)}
                        >
                          {k.active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleDeleteKey(k.id)}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dynamic API Feed links for active credentials */}
        {keys.length > 0 && (
          <div style={{ borderTop: "2px solid var(--border-light)", paddingTop: "2rem" }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "1.5rem" }}>🔗 Integration Endpoint URL Links</h2>
            {keys.map((k) => {
              const links = getClientLinks(k);
              return (
                <div key={k.id} className="premium-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{k.name}</h3>
                      <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Client ID: `{k.clientId}` | Status: <strong style={{ color: k.active ? "#10b981" : "#ef4444" }}>{k.active ? "ACTIVE" : "REVOKED"}</strong>
                      </p>
                    </div>
                    {links.length > 0 && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        onClick={() => copyAllLinks(k)}
                      >
                        {copiedId === `all_${k.id}` ? "Copied All!" : "📋 Copy All API Links"}
                      </button>
                    )}
                  </div>

                  {links.length === 0 ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", backgroundColor: "var(--bg-app)", borderRadius: "6px" }}>
                      No active API permissions selected. Check the checkboxes in the table above to enable APIs and generate links.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {links.map((item, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.5rem 0.75rem", backgroundColor: "var(--bg-app)", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: "700", width: "200px", flexShrink: 0 }}>
                            {item.label}
                          </span>
                          <code style={{ flex: 1, fontSize: "0.74rem", overflowX: "auto", whiteSpace: "nowrap", color: "var(--text-primary)" }}>
                            {item.url}
                          </code>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", flexShrink: 0 }}
                            onClick={() => copyToClipboard(item.url, `link_${k.id}_${idx}`)}
                          >
                            {copiedId === `link_${k.id}_${idx}` ? "Copied!" : "Copy URL"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
