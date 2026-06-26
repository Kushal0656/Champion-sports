<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/header.php';
pageHeader('Match Scorecard');
require_once __DIR__ . '/includes/sidebar.php';

$db = getDB();
$matches = $db->query("SELECT m.*, ta.name as team_a_name, tb.name as team_b_name FROM matches m LEFT JOIN teams ta ON m.team_a_id=ta.id LEFT JOIN teams tb ON m.team_b_id=tb.id ORDER BY m.id DESC")->fetchAll();
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">📋 Detailed Scorecard</h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">View comprehensive team batsman records, bowling performance, and live stream feed.</p>
        </div>
    </div>

    <!-- Match & Innings Selector Grid -->
    <div class="grid-2" style="margin-bottom:2rem;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;">
        <div class="premium-card" style="padding:1.5rem;">
            <h2 style="font-size:1.2rem;margin-bottom:1.25rem;">🔍 Select Match</h2>
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Match</label>
                    <select id="match-select" class="form-select" onchange="onMatchChange(this.value)">
                        <option value="">-- Choose Match --</option>
                        <?php foreach ($matches as $match): ?>
                            <option value="<?= $match['id'] ?>" data-stream="<?= htmlspecialchars($match['stream_url'] ?? '') ?>">
                                <?= htmlspecialchars($match['team_a_name']) ?> vs <?= htmlspecialchars($match['team_b_name']) ?> (<?= htmlspecialchars($match['venue']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Innings</label>
                    <select id="innings-select" class="form-select" disabled onchange="onInningsChange(this.value)">
                        <option value="">-- Choose Innings --</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- Win Probability Card -->
        <div class="premium-card" id="win-probability-card" style="padding:1.5rem;display:none;">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;">⚡ Live Win Probability</h2>
            <div style="display:flex;align-items:center;justify-content:center;height:120px;flex-direction:column;">
                <div style="display:flex;width:100%;height:24px;border-radius:12px;background:#e2e8f0;overflow:hidden;margin-bottom:.75rem;">
                    <div id="prob-bar-a" style="background:var(--primary);width:50%;transition:all .5s ease;"></div>
                    <div id="prob-bar-b" style="background:var(--success);width:50%;transition:all .5s ease;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;width:100%;font-size:.9rem;font-weight:700;color:var(--text-secondary);">
                    <span id="lbl-prob-a">Team A: 50%</span>
                    <span id="lbl-prob-b">Team B: 50%</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Scorecard View (Hidden initially) -->
    <div id="scorecard-view" class="hidden">
        <!-- Live Stream Panel -->
        <div class="premium-card" id="stream-card" style="margin-bottom:2rem;display:none;padding:1.5rem;">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;">📺 Match Broadcast</h2>
            <div id="video-container">
                <!-- YouTube Iframe goes here -->
            </div>
        </div>

        <!-- Live Score Summary Header -->
        <div class="premium-card" style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:1.75rem;margin-bottom:2rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.5rem;">
                <div>
                    <span id="scorecard-badge" class="badge badge-success" style="margin-bottom:.5rem;">ACTIVE</span>
                    <h1 id="scorecard-team-runs" style="color:#fff;font-size:3rem;margin:0;font-family:var(--font-heading);">0/0</h1>
                    <p id="scorecard-overs" style="color:#94a3b8;margin:.25rem 0 0;font-weight:600;font-size:1.1rem;">(0.0 Overs)</p>
                </div>
                <div style="text-align:right;">
                    <div id="scorecard-extras" style="color:#cbd5e1;font-size:.9rem;font-weight:600;margin-bottom:.25rem;">Extras: 0</div>
                    <div id="scorecard-target" style="color:#cbd5e1;font-size:1.1rem;font-weight:700;">Target: —</div>
                </div>
            </div>
        </div>

        <!-- Batsmen & Bowlers Grid -->
        <div class="grid-2" style="margin-bottom:2rem;align-items:start;">
            <!-- Batting Card -->
            <div class="premium-card" style="padding:1.5rem;">
                <h2 style="font-size:1.2rem;margin-bottom:1rem;">🏏 Batting Statistics</h2>
                <div class="table-container" style="margin:0;">
                    <table class="premium-table" style="font-size:.9rem;">
                        <thead>
                            <tr>
                                <th>Batsman</th>
                                <th>Status</th>
                                <th style="text-align:center;">R</th>
                                <th style="text-align:center;">B</th>
                                <th style="text-align:center;">4s</th>
                                <th style="text-align:center;">6s</th>
                                <th style="text-align:center;">SR</th>
                            </tr>
                        </thead>
                        <tbody id="batting-tbody">
                            <!-- Batsmen stats go here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Bowling Card -->
            <div class="premium-card" style="padding:1.5rem;">
                <h2 style="font-size:1.2rem;margin-bottom:1rem;">🎯 Bowling Performance</h2>
                <div class="table-container" style="margin:0;">
                    <table class="premium-table" style="font-size:.9rem;">
                        <thead>
                            <tr>
                                <th>Bowler</th>
                                <th style="text-align:center;">O</th>
                                <th style="text-align:center;">R</th>
                                <th style="text-align:center;">W</th>
                                <th style="text-align:center;">Econ</th>
                            </tr>
                        </thead>
                        <tbody id="bowling-tbody">
                            <!-- Bowlers stats go here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Recent Deliveries Feed -->
        <div class="premium-card" style="padding:1.5rem;">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;">⚡ Recent Deliveries (Last 20 Balls)</h2>
            <div id="balls-feed" style="display:flex;gap:.5rem;flex-wrap:wrap;padding:.5rem 0;">
                <!-- Ball tags go here -->
            </div>
        </div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
let selectedMatchId = null;
let selectedInningsId = null;
let liveInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const mId = params.get('matchId');
    const iId = params.get('inningsId');

    if (mId) {
        document.getElementById('match-select').value = mId;
        onMatchChange(mId, iId);
    } else {
        const savedMatch = localStorage.getItem('scorecard_match_id');
        if (savedMatch) {
            document.getElementById('match-select').value = savedMatch;
            onMatchChange(savedMatch);
        }
    }
});

async function onMatchChange(matchId, autoSelectInningsId = null) {
    selectedMatchId = matchId ? Number(matchId) : null;
    const innSelect = document.getElementById('innings-select');
    const view = document.getElementById('scorecard-view');
    const stream = document.getElementById('stream-card');
    const probCard = document.getElementById('win-probability-card');

    if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }

    if (!selectedMatchId) {
        localStorage.removeItem('scorecard_match_id');
        innSelect.disabled = true;
        innSelect.innerHTML = '<option value="">-- Choose Innings --</option>';
        view.classList.add('hidden');
        stream.style.display = 'none';
        probCard.style.display = 'none';
        return;
    }

    localStorage.setItem('scorecard_match_id', matchId);
    innSelect.disabled = false;
    
    // Check video stream
    const opt = document.getElementById('match-select').selectedOptions[0];
    const streamUrl = opt.getAttribute('data-stream');
    loadStream(streamUrl);

    try {
        const res = await fetch(`${BASE}/api/innings.php?matchId=${selectedMatchId}`);
        const innings = await res.json();
        
        innSelect.innerHTML = '<option value="">-- Choose Innings --</option>' + 
            innings.map(i => `<option value="${i.id}">${i.battingTeam?.name} Innings #${i.inningsNumber}</option>`).join('');

        let activeId = autoSelectInningsId || localStorage.getItem(`scorecard_innings_id_match_${selectedMatchId}`);
        if (activeId && innings.some(i => i.id === Number(activeId))) {
            innSelect.value = activeId;
            onInningsChange(activeId);
        } else if (innings.length > 0) {
            innSelect.value = innings[0].id;
            onInningsChange(innings[0].id);
        } else {
            view.classList.add('hidden');
        }
    } catch(e) {
        console.error(e);
    }
}

function loadStream(url) {
    const streamCard = document.getElementById('stream-card');
    const container = document.getElementById('video-container');
    
    if (!url) {
        streamCard.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    const ytMatch = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
    const videoId = ytMatch ? ytMatch[1] : null;
    
    streamCard.style.display = 'block';
    if (videoId) {
        container.innerHTML = `
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;border:1px solid var(--border-light);">
                <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allow="autoplay" allowfullscreen></iframe>
            </div>`;
    } else {
        container.innerHTML = `
            <div style="text-align:center;padding:1.5rem 0;">
                <a href="${url}" target="_blank" class="btn btn-primary">▶ Open Live Video Stream</a>
            </div>`;
    }
}

function onInningsChange(inningsId) {
    selectedInningsId = inningsId ? Number(inningsId) : null;
    const view = document.getElementById('scorecard-view');

    if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }

    if (!selectedInningsId) {
        localStorage.removeItem(`scorecard_innings_id_match_${selectedMatchId}`);
        view.classList.add('hidden');
        return;
    }

    localStorage.setItem(`scorecard_innings_id_match_${selectedMatchId}`, inningsId);
    view.classList.remove('hidden');

    loadScorecardData();
    liveInterval = setInterval(loadScorecardData, 4000);
}

async function loadScorecardData() {
    if (!selectedInningsId) return;
    try {
        const res = await fetch(`${BASE}/api/live-score.php?id=${selectedInningsId}`);
        const data = await res.json();
        const inn = data.innings;

        // Render summary
        document.getElementById('scorecard-team-runs').textContent = `${inn.runs}/${inn.wickets}`;
        document.getElementById('scorecard-overs').textContent = `(${inn.overs}.${inn.balls} Overs)`;
        document.getElementById('scorecard-extras').textContent = `Extras: ${inn.extras}`;
        document.getElementById('scorecard-target').textContent = inn.target ? `Target: ${inn.target}` : '';
        
        const badge = document.getElementById('scorecard-badge');
        if (inn.completed) {
            badge.textContent = 'COMPLETED';
            badge.className = 'badge badge-danger';
        } else {
            badge.textContent = 'LIVE';
            badge.className = 'badge badge-success';
        }

        // Render Batting
        const batTbody = document.getElementById('batting-tbody');
        if (data.batting.length === 0) {
            batTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No batting records yet.</td></tr>';
        } else {
            batTbody.innerHTML = data.batting.map(b => {
                const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : '0.00';
                return `
                    <tr style="${!b.out && !inn.completed ? 'background:#ecfdf5;' : ''}">
                        <td><strong>${escapeHtml(b.player?.name)}</strong> ${!b.out && !inn.completed ? '<span style="color:var(--success);">★</span>' : ''}</td>
                        <td>${b.out ? '<span class="badge badge-danger" style="font-size:.7rem;padding:.15rem .4rem;">Out</span>' : '<span class="badge badge-success" style="font-size:.7rem;padding:.15rem .4rem;">Batting</span>'}</td>
                        <td style="text-align:center;font-weight:700;">${b.runs}</td>
                        <td style="text-align:center;color:var(--text-secondary);">${b.balls}</td>
                        <td style="text-align:center;color:var(--text-muted);">${b.fours}</td>
                        <td style="text-align:center;color:var(--text-muted);">${b.sixes}</td>
                        <td style="text-align:center;font-weight:600;color:var(--primary);">${sr}</td>
                    </tr>
                `;
            }).join('');
        }

        // Render Bowling
        const bowlTbody = document.getElementById('bowling-tbody');
        if (data.bowling.length === 0) {
            bowlTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No bowling records yet.</td></tr>';
        } else {
            bowlTbody.innerHTML = data.bowling.map(b => {
                const totalBalls = Math.floor(b.overs) * 6 + Math.round((b.overs - Math.floor(b.overs)) * 10);
                const econ = totalBalls > 0 ? ((b.runsConceded / totalBalls) * 6).toFixed(2) : '0.00';
                return `
                    <tr>
                        <td><strong>${escapeHtml(b.player?.name)}</strong></td>
                        <td style="text-align:center;font-weight:600;">${b.overs}</td>
                        <td style="text-align:center;color:var(--text-secondary);">${b.runsConceded}</td>
                        <td style="text-align:center;font-weight:700;color:var(--danger);">${b.wickets}</td>
                        <td style="text-align:center;font-weight:600;color:var(--success);">${econ}</td>
                    </tr>
                `;
            }).join('');
        }

        // Render recent balls
        const feed = document.getElementById('balls-feed');
        if (data.recentBalls.length === 0) {
            feed.innerHTML = '<span style="color:var(--text-muted);font-style:italic;">No deliveries scored yet.</span>';
        } else {
            feed.innerHTML = data.recentBalls.slice(0, 20).map(b => {
                let bg = '#64748b'; // default dot
                let color = '#fff';
                let text = b.runs;
                
                if (b.isWicket) {
                    bg = 'var(--danger)';
                    text = 'W';
                } else if (b.extraType === 'WIDE') {
                    bg = 'var(--warning)';
                    text = 'WD';
                } else if (b.extraType === 'NO_BALL') {
                    bg = 'var(--warning)';
                    text = 'NB';
                } else if (b.runs === 4) {
                    bg = 'var(--success)';
                } else if (b.runs === 6) {
                    bg = 'var(--primary)';
                }
                
                return `
                    <div style="width:36px;height:36px;border-radius:50%;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem;box-shadow:var(--shadow-sm);" title="Over ${b.over}.${b.ball}">
                        ${text}
                    </div>
                `;
            }).join('');
        }

        // Handle Win Probability calculations
        calculateWinProbability(inn);
    } catch(e) {
        console.error(e);
    }
}

function calculateWinProbability(inn) {
    const card = document.getElementById('win-probability-card');
    const barA = document.getElementById('prob-bar-a');
    const barB = document.getElementById('prob-bar-b');
    const lblA = document.getElementById('lbl-prob-a');
    const lblB = document.getElementById('lbl-prob-b');
    
    card.style.display = 'block';

    const matchOpt = document.getElementById('match-select').selectedOptions[0];
    const teamAName = matchOpt.text.split(' vs ')[0] || 'Team A';
    const teamBName = matchOpt.text.split(' vs ')[1]?.split(' (')[0] || 'Team B';

    // Heuristics calculation
    let pA = 50;
    let pB = 50;

    if (inn.inningsNumber === 1) {
        // Innings 1: simple score-based heuristics
        const runs = inn.runs;
        const wkts = inn.wickets;
        const overs = inn.overs + (inn.balls / 6);
        
        if (overs > 0) {
            const runrate = runs / overs;
            const projectScore = runrate * 20; // assumed T20
            
            // Adjust based on wickets
            const baseline = Math.min(100, Math.max(0, (projectScore - 120) * 0.5 + 50));
            const wicketPenalty = wkts * 3;
            pA = Math.round(Math.min(95, Math.max(5, baseline - wicketPenalty)));
            pB = 100 - pA;
        }
    } else {
        // Innings 2: target-based heuristics
        const runs = inn.runs;
        const target = inn.target || 120;
        const wkts = inn.wickets;
        const overs = inn.overs + (inn.balls / 6);
        const totalOversLimit = 20;
        
        const remainingRuns = target - runs;
        const remainingBalls = Math.max(0, (totalOversLimit - overs) * 6);
        const remainingOvers = remainingBalls / 6;

        if (remainingBalls > 0) {
            const reqRunRate = remainingRuns / remainingOvers;
            const wicketsInHand = 10 - wkts;
            
            // Winning chances of batting team (Team B)
            let chanceB = 50;
            if (reqRunRate <= 6) chanceB = 80;
            else if (reqRunRate <= 9) chanceB = 60;
            else if (reqRunRate <= 12) chanceB = 40;
            else chanceB = 15;
            
            // Adjust for wickets
            if (wicketsInHand <= 2) chanceB = Math.max(5, chanceB - 35);
            else if (wicketsInHand <= 4) chanceB = Math.max(5, chanceB - 15);
            
            pB = Math.round(Math.min(98, Math.max(2, chanceB)));
            pA = 100 - pB;
        } else {
            pB = runs >= target ? 100 : 0;
            pA = 100 - pB;
        }
    }

    barA.style.width = `${pA}%`;
    barB.style.width = `${pB}%`;
    lblA.textContent = `${teamAName}: ${pA}%`;
    lblB.textContent = `${teamBName}: ${pB}%`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
</script>
<?php pageFooter(); ?>
