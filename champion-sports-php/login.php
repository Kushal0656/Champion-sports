<?php
require_once __DIR__ . '/includes/auth.php';

// Handle POST login check
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $d = getInput();
    $email = $d['email'] ?? '';
    
    if (loginAdminByEmail($email)) {
        jsonResponse(['success' => true]);
    } else {
        jsonResponse([
            'success' => false,
            'error'   => 'This email is not authorized as an administrator.'
        ], 403);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Console Access | Champion Sports</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?= SITE_URL ?>/assets/style.css">
    
    <!-- Firebase SDK Compat -->
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>

    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
            padding: 2rem;
        }
        .login-card {
            background: #fff;
            border-radius: 24px;
            padding: 3rem 2rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
            text-align: center;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .login-logo {
            font-size: 3rem;
            margin: 0;
        }
        .login-title {
            font-size: 1.75rem;
            margin: 0 0 0.25rem;
        }
        .login-subtitle {
            font-size: 0.85rem;
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .hidden {
            display: none !important;
        }
    </style>
</head>
<body>

<div class="login-card">
    <div class="login-logo">🏏</div>
    <div>
        <h1 class="login-title">Champion Sports</h1>
        <span class="login-subtitle">Admin Console Access</span>
    </div>
    
    <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
        Please log in using your authorized administrator Google Account to access scoring, matches, and overlays.
    </p>

    <!-- Google Sign In Button -->
    <div id="google-login-container">
        <button class="btn btn-primary" id="btn-google" style="width: 100%; padding: 1rem; font-size: 1rem; margin-top: 1rem;">
            Sign in with Google
        </button>
    </div>

    <!-- Local Bypass Form -->
    <div id="local-login-container" class="hidden" style="text-align: left; margin-top: 1rem;">
        <form id="bypass-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">Authorized Admin Email</label>
                <input type="email" id="local-email" required placeholder="kushalkarri1117@gmail.com" class="form-input" style="font-size: 0.9rem; padding: 0.6rem 0.8rem;">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem; font-size: 1rem; margin-top: 0.5rem;">
                Log In Locally
            </button>
        </form>
    </div>

    <div style="margin-top: 0.5rem;">
        <button id="toggle-bypass-btn" style="background: none; border: none; color: var(--primary); text-decoration: underline; cursor: pointer; font-size: 0.85rem; font-weight: 600;">
            Or use Local Admin Bypass (for OBS & Offline)
        </button>
    </div>
</div>

<script>
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWlFEGpitGuhx7ZAdTmFXV_UV72O_8HOs",
  authDomain: "champion-sports.firebaseapp.com",
  projectId: "champion-sports",
  storageBucket: "champion-sports.firebasestorage.app",
  messagingSenderId: "327761052374",
  appId: "1:327761052374:web:c2e35ad2e45d19ffd57f77",
  measurementId: "G-2H6C716HZ2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// DOM elements
const btnGoogle = document.getElementById('btn-google');
const googleContainer = document.getElementById('google-login-container');
const localContainer = document.getElementById('local-login-container');
const toggleBypassBtn = document.getElementById('toggle-bypass-btn');
const bypassForm = document.getElementById('bypass-form');

let showLocalLogin = false;

// Handle toggle bypass link
toggleBypassBtn.addEventListener('click', () => {
    showLocalLogin = !showLocalLogin;
    if (showLocalLogin) {
        googleContainer.classList.add('hidden');
        localContainer.classList.remove('hidden');
        toggleBypassBtn.textContent = '← Back to Google Sign In';
    } else {
        googleContainer.classList.remove('hidden');
        localContainer.classList.add('hidden');
        toggleBypassBtn.textContent = 'Or use Local Admin Bypass (for OBS & Offline)';
    }
});

// Google Sign-In Action
btnGoogle.addEventListener('click', () => {
    auth.signInWithPopup(provider).then(async (result) => {
        const email = result.user.email;
        
        // Post to local session login
        try {
            const res = await fetch('login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                // Save user info to localStorage (matching React)
                localStorage.setItem("user", JSON.stringify(result.user));
                alert("Login Successful");
                window.location.href = 'index.php';
            } else {
                alert(data.error || "You are not authorized as an administrator.");
                await auth.signOut();
            }
        } catch(e) {
            console.error(e);
            alert("Google Sign In verification failed.");
            await auth.signOut();
        }
    }).catch((err) => {
        console.error(err);
        alert("Google Login Failed. Please try using the Local Admin Bypass.");
    });
});

// Local Bypass Action
bypassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('local-email').value.trim();
    
    try {
        const res = await fetch('login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
            // Save mock user info to localStorage
            localStorage.setItem("user", JSON.stringify({
                email: email,
                displayName: "Local Admin Bypass",
                photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80"
            }));
            alert("Local Bypass Login Successful");
            window.location.href = 'index.php';
        } else {
            alert(data.error || "This email is not authorized as an administrator.");
        }
    } catch(e) {
        console.error(e);
        alert("Local Login failed.");
    }
});
</script>
</body>
</html>
