<?php
require_once __DIR__ . '/includes/auth.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OBS Live Overlay Broadcast | Champion Sports</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&family=Plus+Jakarta+Sans:wght@600;800&display=swap" rel="stylesheet">
    <style>
        body, html {
            margin: 0; padding: 0; width: 100%; height: 100%;
            background-color: transparent; overflow: hidden;
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #fff;
        }
        .overlay-canvas {
            position: relative; width: 100vw; height: 100vh;
            background-size: cover; background-position: center; background-repeat: no-repeat;
            overflow: hidden;
        }
        .overlay-el {
            position: absolute; display: flex; align-items: center; box-sizing: border-box;
        }
        
        /* Premium Scoreboard Styling */
        .premium-scoreboard {
            display: flex; align-items: center; width: 100%; height: 100%;
            background: linear-gradient(90deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%);
            border: 2px solid rgba(255,255,255,0.15); border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5); padding: 0 1.5rem;
            justify-content: space-between; overflow: hidden;
        }
        .sb-badge {
            background: #ef4444; color: #fff; font-size: 0.72rem; font-weight: 800;
            padding: 0.2rem 0.5rem; border-radius: 4px; letter-spacing: 0.05em;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0%,100% {opacity:1;} 50% {opacity:0.6;} }
        
        .sb-runs {
            font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 900;
            color: #fff; margin-left: 0.5rem;
        }
        .sb-overs {
            font-size: 1rem; color: #94a3b8; font-weight: 600; margin-left: 0.4rem;
        }
        .sb-players {
            display: flex; gap: 1.25rem; font-size: 0.85rem; color: #e2e8f0; font-weight: 700;
        }
        .sb-active-player { color: #fbbf24; }
        
        .custom-text {
            font-family: 'Outfit', sans-serif; font-weight: 900; text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
            width: 100%; height: 100%; display: flex; align-items: center;
        }
    </style>
</head>
<body>

<div id="canvas" class="overlay-canvas">
    <!-- Overlay elements will be injected here -->
</div>

<script>
const BASE = '<?= SITE_URL ?>';
let activeSlideId = null;
let currentLayout = [];

async function pollOverlay() {
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?active=1`);
        if (!res.ok) { clearOverlay(); return; }
        
        const slide = await res.json();
        if (!slide) { clearOverlay(); return; }
        
        // Update background
        const canvas = document.getElementById('canvas');
        if (slide.imageUrl) {
            canvas.style.backgroundImage = `url('${slide.imageUrl}')`;
        } else {
            canvas.style.backgroundImage = 'none';
        }
        
        activeSlideId = slide.id;
        currentLayout = JSON.parse(slide.overlayLayout || '[]');
        
        renderLayout();
    } catch(e) {
        clearOverlay();
    }
}

function clearOverlay() {
    activeSlideId = null;
    currentLayout = [];
    const canvas = document.getElementById('canvas');
    canvas.style.backgroundImage = 'none';
    canvas.innerHTML = '';
}

async function renderLayout() {
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    
    // Check if any element is a scoreboard
    const hasScoreboard = currentLayout.some(el => el.type === 'scoreboard' && el.visible);
    let scoreData = null;
    
    if (hasScoreboard) {
        try {
            const cfg = await fetch(`${BASE}/api/content.php?key=live_innings_id`).then(r => r.json());
            if (cfg && cfg.value) {
                const scoreRes = await fetch(`${BASE}/api/live-score.php?id=${cfg.value}`);
                if (scoreRes.ok) {
                    scoreData = await scoreRes.json();
                }
            }
        } catch(e){}
    }

    currentLayout.forEach(el => {
        if (!el.visible) return;
        
        const div = document.createElement('div');
        div.className = 'overlay-el';
        div.style.left = `${el.x}%`;
        div.style.top = `${el.y}%`;
        div.style.width = `${el.width}px`;
        div.style.height = `${el.height}px`;
        
        if (el.type === 'scoreboard') {
            if (scoreData) {
                const inn = scoreData.innings;
                const striker = scoreData.batting.find(b => !b.out) || { player: { name: 'Striker' }, runs: 0, balls: 0 };
                const bowler = scoreData.bowling[scoreData.bowling.length - 1] || { player: { name: 'Bowler' }, wickets: 0, runsConceded: 0 };
                
                div.innerHTML = `
                    <div class="premium-scoreboard">
                        <div style="display:flex;align-items:center;">
                            <span class="sb-badge">LIVE</span>
                            <span style="font-weight:800;font-size:1.1rem;margin-left:0.75rem;color:#fbbf24;">${inn.battingTeam?.shortName || ''}</span>
                            <span class="sb-runs">${inn.runs}/${inn.wickets}</span>
                            <span class="sb-overs">(${inn.overs}.${inn.balls})</span>
                        </div>
                        <div class="sb-players">
                            <span class="sb-active-player">🏏 ${striker.player?.name || 'Striker'} ${striker.runs}(${striker.balls})</span>
                            <span>🎯 ${bowler.player?.name || 'Bowler'} ${bowler.wickets}/${bowler.runsConceded}</span>
                        </div>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="premium-scoreboard">
                        <span class="sb-badge">LIVE</span>
                        <span style="color:#cbd5e1;font-size:0.9rem;">Waiting for live scorecard...</span>
                    </div>`;
            }
        } else if (el.type === 'text') {
            div.innerHTML = `<div class="custom-text" style="font-size:${Math.round(el.height * 0.55)}px;">${escapeHtml(el.text || '')}</div>`;
        }
        
        canvas.appendChild(div);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

setInterval(pollOverlay, 2000);
pollOverlay();
</script>
</body>
</html>
