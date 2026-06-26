<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/header.php';
pageHeader('Dashboard');
require_once __DIR__ . '/includes/sidebar.php';
?>
<div class="main-content">
    <div style="margin-bottom:2rem;border-bottom:1px solid var(--border-light);padding-bottom:1.25rem;">
        <h1 style="margin:0;font-size:1.75rem;">🏆 Champion Sports Dashboard</h1>
        <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">Live match scoring, stats and fan portal.</p>
    </div>

    <!-- Stats Row -->
    <div class="grid-4" style="margin-bottom:2rem;" id="stats-row">
        <div class="premium-card stat-card"><div class="stat-value" id="stat-teams">—</div><div class="stat-label">Teams</div></div>
        <div class="premium-card stat-card"><div class="stat-value" id="stat-matches">—</div><div class="stat-label">Matches</div></div>
        <div class="premium-card stat-card"><div class="stat-value" id="stat-live">—</div><div class="stat-label">Live Now</div></div>
        <div class="premium-card stat-card"><div class="stat-value" id="stat-players">—</div><div class="stat-label">Players</div></div>
    </div>

    <!-- Live Match Scorecard -->
    <div class="grid-2" style="margin-bottom:2rem;">
        <div class="premium-card" id="live-score-card">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;">⚡ Live Scorecard</h2>
            <div id="live-score-body" style="color:var(--text-muted);text-align:center;padding:2rem 0;">Loading...</div>
        </div>
        <div class="premium-card">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;">📺 Live Stream</h2>
            <div id="video-container">
                <div style="color:var(--text-muted);text-align:center;padding:2rem 0;">Loading stream...</div>
            </div>
        </div>
    </div>

    <!-- Upcoming Matches -->
    <div class="premium-card" style="margin-bottom:2rem;">
        <h2 style="font-size:1.2rem;margin-bottom:1rem;">📅 Recent & Upcoming Matches</h2>
        <div class="table-container" style="margin:0;">
            <table class="premium-table">
                <thead><tr><th>Match</th><th>Venue</th><th>Date</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="matches-tbody"><tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading...</td></tr></tbody>
            </table>
        </div>
    </div>

    <!-- Points Table -->
    <div class="premium-card">
        <h2 style="font-size:1.2rem;margin-bottom:1rem;">📊 Points Table</h2>
        <div id="points-table-body"><div style="color:var(--text-muted);text-align:center;padding:2rem;">Loading...</div></div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';

async function loadDashboard() {
    try {
        const [teams, matches, players] = await Promise.all([
            fetch(`${BASE}/api/teams.php`).then(r=>r.json()),
            fetch(`${BASE}/api/matches.php`).then(r=>r.json()),
            fetch(`${BASE}/api/players.php`).then(r=>r.json()),
        ]);
        document.getElementById('stat-teams').textContent   = teams.length;
        document.getElementById('stat-matches').textContent = matches.length;
        document.getElementById('stat-live').textContent    = matches.filter(m=>m.status==='LIVE').length;
        document.getElementById('stat-players').textContent = players.length;

        // Matches table (last 8)
        const tbody = document.getElementById('matches-tbody');
        const recent = matches.slice(0, 8);
        tbody.innerHTML = recent.map(m => `
            <tr>
                <td><strong>${m.teamA?.name||'TBD'} vs ${m.teamB?.name||'TBD'}</strong></td>
                <td>${m.venue||'—'}</td>
                <td>${m.matchDate ? new Date(m.matchDate).toLocaleDateString('en-IN') : '—'}</td>
                <td>${statusBadge(m.status)}</td>
                <td><a href="${BASE}/scorecard.php?matchId=${m.id}" class="btn btn-secondary btn-sm">View</a></td>
            </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">No matches yet</td></tr>';
    } catch(e) { console.error(e); }
}

async function loadLiveScore() {
    try {
        // Get live match ID from content
        const cfg = await fetch(`${BASE}/api/content.php?key=live_innings_id`).then(r=>r.json());
        const inningsId = cfg.value;
        const el = document.getElementById('live-score-body');
        if (!inningsId) { el.innerHTML = '<p style="color:var(--text-muted);">No live match configured.</p>'; return; }
        const data = await fetch(`${BASE}/api/live-score.php?id=${inningsId}`).then(r=>r.json());
        const inn = data.innings;
        el.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;">
                <span class="live-badge"><span class="live-dot"></span>LIVE</span>
                <span style="font-size:.85rem;color:var(--text-muted);">${inn.battingTeam?.name||''} batting</span>
            </div>
            <div class="score-display">${inn.runs}/${inn.wickets}</div>
            <div class="score-small">${inn.overs}.${inn.balls} overs${inn.target?' | Target: '+inn.target:''}</div>
            <div style="margin-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:.5rem;font-size:.85rem;">
                ${data.batting.filter(b=>!b.out).slice(0,2).map(b=>`
                    <div style="background:var(--bg-app);padding:.5rem .75rem;border-radius:8px;">
                        🏏 ${b.player?.name} <strong>${b.runs}(${b.balls})</strong>
                    </div>`).join('')}
                ${data.bowling.slice(-1).map(b=>`
                    <div style="background:var(--bg-app);padding:.5rem .75rem;border-radius:8px;">
                        🎯 ${b.player?.name} <strong>${b.wickets}/${b.runsConceded}</strong>
                    </div>`).join('')}
            </div>`;
    } catch(e) {
        document.getElementById('live-score-body').innerHTML = '<p style="color:var(--text-muted);">No live match data.</p>';
    }
}

async function loadVideo() {
    try {
        const cfg = await fetch(`${BASE}/api/content.php?key=homepage_video_url`).then(r=>r.json());
        const url = cfg.value;
        const el = document.getElementById('video-container');
        if (!url) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem 0;">No stream configured.</p>'; return; }
        const match = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
        const vid = match ? match[1] : null;
        if (vid) {
            el.innerHTML = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;">
                <iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="autoplay" allowfullscreen></iframe>
            </div>`;
        } else {
            el.innerHTML = `<a href="${url}" target="_blank" class="btn btn-primary" style="display:block;text-align:center;">▶ Watch Stream</a>`;
        }
    } catch(e) {}
}

async function loadPointsTable() {
    try {
        const rows = await fetch(`${BASE}/api/points-table.php`).then(r=>r.json());
        const el = document.getElementById('points-table-body');
        if (!rows.length) { el.innerHTML='<p style="text-align:center;color:var(--text-muted);padding:2rem;">No data yet.</p>'; return; }
        el.innerHTML = `<div class="table-container" style="margin:0;"><table class="premium-table">
            <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
            <tbody>${rows.map((r,i)=>`<tr>
                <td>${i+1}</td>
                <td><strong>${r.teamName}</strong></td>
                <td>${r.played}</td><td style="color:var(--success);font-weight:700;">${r.won}</td>
                <td style="color:var(--danger);">${r.lost}</td>
                <td style="font-weight:800;color:var(--primary);">${r.points}</td>
            </tr>`).join('')}</tbody>
        </table></div>`;
    } catch(e) {}
}

loadDashboard();
loadLiveScore();
loadVideo();
loadPointsTable();
setInterval(loadLiveScore, 8000);
</script>
<?php pageFooter(); ?>
