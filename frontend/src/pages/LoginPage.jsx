import { useState } from "react";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";

export default function LoginPage() {
  const provider = new GoogleAuthProvider();
  const allowedAdmins = ["kushalkarri1117@gmail.com"];

  const [localEmail, setLocalEmail] = useState("");
  const [showLocalLogin, setShowLocalLogin] = useState(false);

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!allowedAdmins.includes(email)) {
        alert("You are not authorized");
        await signOut(auth);
        return;
      }

      localStorage.setItem("user", JSON.stringify(result.user));
      alert("Login Successful");
      console.log(result.user);
      window.location.href = "/overlay-studio";
    } catch (error) {
      console.error(error);
      alert("Google Login Failed. Please try using the Local Admin Bypass below.");
    }
  };

  const handleLocalLogin = (e) => {
    e.preventDefault();
    if (!allowedAdmins.includes(localEmail.trim())) {
      alert("This email is not authorized as an administrator.");
      return;
    }
    localStorage.setItem("user", JSON.stringify({
      email: localEmail.trim(),
      displayName: "Local Admin Bypass",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
    }));
    alert("Local Bypass Login Successful");
    window.location.href = "/overlay-studio";
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        backgroundColor: "var(--bg-app)",
        padding: "2rem"
      }}
    >
      <div 
        className="premium-card" 
        style={{ 
          maxWidth: "400px", 
          width: "100%", 
          textAlign: "center", 
          display: "flex", 
          flexDirection: "column", 
          gap: "1.5rem",
          padding: "3rem 2rem"
        }}
      >
        <div style={{ fontSize: "3rem" }}>🏏</div>
        <div>
          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Champion Sports</h1>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Admin Console Access
          </span>
        </div>
        
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          Please log in using your authorized administrator Google Account to access scoring, matches, and overlays.
        </p>

        {!showLocalLogin ? (
          <button
            className="btn btn-primary"
            onClick={login}
            style={{ width: "100%", padding: "1rem", fontSize: "1rem", marginTop: "1rem" }}
          >
            Sign in with Google
          </button>
        ) : (
          <form onSubmit={handleLocalLogin} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem", textAlign: "left" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-secondary)" }}>Authorized Admin Email</label>
              <input
                type="email"
                required
                placeholder="kushalkarri1117@gmail.com"
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                className="form-input"
                style={{ fontSize: "0.9rem", padding: "0.6rem 0.8rem" }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.8rem", fontSize: "1rem", marginTop: "0.5rem" }}
            >
              Log In Locally
            </button>
          </form>
        )}

        <div style={{ marginTop: "0.5rem" }}>
          <button
            onClick={() => setShowLocalLogin(!showLocalLogin)}
            style={{
              background: "none",
              border: "none",
              color: "var(--primary)",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600"
            }}
          >
            {showLocalLogin ? "← Back to Google Sign In" : "Or use Local Admin Bypass (for OBS & Offline)"}
          </button>
        </div>
      </div>
    </div>
  );
}