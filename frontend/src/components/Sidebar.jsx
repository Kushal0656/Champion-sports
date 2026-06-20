import { Link, useLocation } from "react-router-dom";
import { isAdminLoggedIn, logoutAdmin } from "../utils/auth";

export default function Sidebar() {
  const location = useLocation();
  const loggedIn = isAdminLoggedIn();

  const links = loggedIn
    ? [
        { path: "/", label: "🏆 Dashboard", icon: "📊" },
        { path: "/teams", label: "🏏 Teams", icon: "👥" },
        { path: "/players", label: "👤 Players", icon: "👤" },
        { path: "/tournament", label: "🏆 Tournaments", icon: "🎖️" },
        { path: "/tournament-teams", label: "🤝 Tournament Teams", icon: "🔗" },
        { path: "/matches", label: "📅 Matches", icon: "🏏" },
        { path: "/live-scoring", label: "⚡ Live Scoring", icon: "🔴" },
        { path: "/overlay-studio", label: "🎨 Overlay Studio", icon: "🎨" },
        { path: "/overlay", label: "🎦 Slides", icon: "🎦" },
        { path: "/scorecard", label: "📋 Scorecard", icon: "📝" },
        { path: "/points-table", label: "📊 Points Table", icon: "📈" },
        { path: "/api-keys", label: "🔑 API Keys", icon: "🔑" }
      ]
    : [
        { path: "/", label: "🏆 Dashboard", icon: "📊" },
        { path: "/teams", label: "🏏 Teams", icon: "👥" },
        { path: "/matches", label: "📅 Matches", icon: "🏏" },
        { path: "/scorecard", label: "📋 Scorecard", icon: "📝" },
        { path: "/points-table", label: "📊 Points Table", icon: "📈" },
        { path: "/login", label: "🔑 Admin Login", icon: "🔒" }
      ];

  const handleLogout = () => {
    logoutAdmin();
    alert("Logged out successfully");
    window.location.href = "/";
  };

  return (
    <div
      style={{
        width: "280px",
        backgroundColor: "var(--bg-sidebar)",
        color: "var(--text-light)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "2rem 1.5rem",
        boxShadow: "var(--shadow-lg)",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <h2 style={{ color: "var(--text-light)", fontSize: "1.5rem", fontWeight: "700" }}>
          🏏 Champion Sports
        </h2>
        <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {loggedIn ? "Admin Portal" : "Fan Portal"}
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.85rem 1.25rem",
                borderRadius: "var(--radius-md)",
                color: isActive ? "var(--text-light)" : "var(--text-muted)",
                backgroundColor: isActive ? "var(--primary)" : "transparent",
                textDecoration: "none",
                fontWeight: isActive ? "700" : "500",
                fontSize: "0.95rem",
                transition: "var(--transition)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--bg-sidebar-hover)";
                  e.currentTarget.style.color = "var(--text-light)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{link.icon}</span>
              {link.label.replace(/^[^\s]+\s+/, "")}
            </Link>
          );
        })}

        {loggedIn && (
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "0.85rem 1.25rem",
              borderRadius: "var(--radius-md)",
              color: "#ef4444",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem",
              textAlign: "left",
              width: "100%",
              transition: "var(--transition)",
              marginTop: "auto"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>🚪</span>
            Logout
          </button>
        )}
      </nav>

      <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {loggedIn ? "Authorized Administrator" : "Guest Mode"}
        </p>
      </div>
    </div>
  );
}