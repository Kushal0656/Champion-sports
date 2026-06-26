<?php
require_once __DIR__ . '/includes/auth.php';
requireAdmin(); // Admin only page
require_once __DIR__ . '/includes/header.php';
pageHeader('Live Scoring Console');
require_once __DIR__ . '/includes/sidebar.php';

$db = getDB();
$matches = $db->query("SELECT m.*, ta.name as team_a_name, tb.name as team_b_name FROM matches m LEFT JOIN teams ta ON m.team_a_id=ta.id LEFT JOIN teams tb ON m.team_b_id=tb.id WHERE m.status != 'COMPLETED' ORDER BY m.id DESC")->fetchAll();
$players = $db->query("SELECT id, name FROM players ORDER BY name")->fetchAll();
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">⚡ Live Scoring Console</h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">Record ball-by-ball actions for live matches.</p>
        </div>
        <div id="undo-container" class="hidden">
            <button class="btn btn-secondary" onclick="handleUndo()" style="border:1px solid var(--danger);color:var(--danger);">↩️ Undo Last Ball</button>
        </div>
    </div>

    <div class="grid-3" style="margin-bottom:2rem;">
        <!-- Match & Innings Selector -->
        <div class="premium-card" style="grid-column:span 3;">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;">🏏 Select Match & Innings</h2>
            <div style="display:flex;gap:1.25rem;flex-wrap:wrap;">
                <div class="form-group" style="flex:1;min-width:250px;margin-bottom:0;">
                    <label class="form-label">1. Select Match</label>
                    <select id="match-select" class="form-select" onchange="onMatchChange(this.value)">
                        <option value="">Select Match</option>
                        <?php foreach ($matches as $match): ?>
                            <option value="<?= $match['id'] ?>" data-teama="<?= $match['team_a_id'] ?>" data-teamb="<?= $match['team_b_id'] ?>">
                                <?= htmlspecialchars($match['team_a_name']) ?> vs <?= htmlspecialchars($match['team_b_name']) ?> (<?= htmlspecialchars($match['venue']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group" style="flex:1;min-width:250px;margin-bottom:0;">
                    <label class="form-label">2. Select Active Innings</label>
                    <select id="innings-select" class="form-select" disabled onchange="onInningsChange(this.value)">
                        <option value="">Select Active Innings</option>
                    </select>
                </div>
            </div>
            
            <div id="quick-actions" class="hidden" style="margin-top:1.25rem;border-top:1px solid var(--border-light);padding-top:1rem;">
                <span style="font-size:0.9rem;fontWeight:600;color:var(--text-secondary);margin-right:1rem;">Quick Actions:</span>
                <button class="btn btn-secondary btn-sm" onclick="startInnings(1)" style="margin-right:.75rem;">🏏 Start Innings 1</button>
                <button class="btn btn-secondary btn-sm" onclick="startInnings(2)">🏏 Start Innings 2</button>
            </div>
        </div>
    </div>

    <!-- Scoring Section (Hidden until innings selected) -->
    <div id="scoring-section" class="hidden">
        <!-- OBS Scoreboard & Overview Panel -->
        <div id="obs-bar" class="premium-card" style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:1.25rem;margin-bottom:2rem;transition:all .3s ease;" onclick="toggleScoreboardOBS()">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
                <div>
                    <div style="display:flex;align-items:baseline;gap:.5rem;margin-bottom:.5rem;">
                        <span id="obs-batting-team" style="color:#fbbf24;font-weight:900;font-size:1.4rem;">—</span>
                        <span id="obs-score" style="color:#fff;font-weight:900;font-size:1.75rem;">0/0</span>
                        <span id="obs-overs" style="color:#94a3b8;font-size:1rem;font-weight:600;">(0.0 Overs)</span>
                    </div>
                    <!-- Current Active personnel display -->
                    <div style="display:flex;gap:1.5rem;font-size:.85rem;color:#cbd5e1;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="color:#fbbf24">★</span>
                            <span id="active-striker-lbl" style="font-weight:700;">Striker</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="color:#cbd5e1">Non-Striker:</span>
                            <span id="active-nonstriker-lbl" style="font-weight:600;">Non-Striker</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="color:#f43f5e">🥎</span>
                            <span id="active-bowler-lbl" style="font-weight:700;">Bowler</span>
                        </div>
                    </div>
                </div>
                <div>
                    <button id="obs-btn" class="btn" style="background:#10b981;color:#fff;font-weight:800;font-size:.85rem;padding:.6rem 1.2rem;border:none;border-radius:6px;cursor:pointer;">📺 Add to OBS Screen</button>
                </div>
            </div>
        </div>

        <!-- Lock Banner -->
        <div id="lock-banner" class="premium-card hidden" style="background:var(--danger-light);border:1px solid var(--danger);color:var(--danger-hover);margin-bottom:2rem;text-align:center;padding:1.5rem;">
            <h2 style="color:var(--danger-hover);font-size:1.4rem;margin:0;">🔒 Scoring Locked (Innings/Match Completed)</h2>
            <p style="font-size:0.9rem;margin-top:0.25rem;">This match has been completed or innings locked. Reopening or edits are disabled.</p>
        </div>

        <div class="grid-3" style="margin-bottom:2rem;">
            <!-- Big Score Display -->
            <div class="premium-card" style="grid-column:span 2;display:flex;flex-direction:column;justify-content:center;min-height:220px;">
                <span id="scoring-innings-badge" class="badge badge-primary" style="width:fit-content;margin-bottom:.5rem;">Innings</span>
                <div style="display:flex;align-items:baseline;gap:1rem;">
                    <h1 id="scoring-runs-wickets" style="font-size:5rem;font-weight:900;margin:0;font-family:var(--font-heading);">0/0</h1>
                    <h3 id="scoring-overs" style="color:var(--text-secondary);font-size:1.75rem;font-weight:500;">(0.0 Overs)</h3>
                </div>
            </div>

            <!-- Roster Active Personnel -->
            <div class="premium-card" style="display:flex;flex-direction:column;gap:1rem;">
                <h2 style="font-size:1.2rem;border-bottom:1px solid var(--border-light);padding-bottom:.5rem;margin:0;">Active Personnel</h2>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Striker</label>
                    <select id="striker-select" class="form-select" onchange="updatePersonnel()">
                        <option value="">Select Striker</option>
                        <?php foreach ($players as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Non-Striker</label>
                    <select id="nonstriker-select" class="form-select" onchange="updatePersonnel()">
                        <option value="">Select Non-Striker</option>
                        <?php foreach ($players as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Bowler</label>
                    <select id="bowler-select" class="form-select" onchange="updatePersonnel()">
                        <option value="">Select Bowler</option>
                        <?php foreach ($players as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
        </div>

        <!-- Scoring Pad -->
        <div class="premium-card" id="scoring-pad-card">
            <h2 style="font-size:1.35rem;margin-bottom:1.5rem;">⚡ Scoring Console Pad</h2>
            <div style="display:flex;flex-wrap:wrap;gap:1rem;">
                <button class="btn" onclick="scoreBall(0)" style="width:90px;height:70px;font-size:1.5rem;background:#334155;color:#fff;">0</button>
                <button class="btn" onclick="scoreBall(1)" style="width:90px;height:70px;font-size:1.5rem;background:var(--primary);color:#fff;">1</button>
                <button class="btn" onclick="scoreBall(2)" style="width:90px;height:70px;font-size:1.5rem;background:var(--primary);color:#fff;">2</button>
                <button class="btn" onclick="scoreBall(3)" style="width:90px;height:70px;font-size:1.5rem;background:var(--primary);color:#fff;">3</button>
                <button class="btn" onclick="scoreBall(4)" style="width:90px;height:70px;font-size:1.5rem;background:var(--success);color:#fff;font-weight:800;">4</button>
                <button class="btn" onclick="scoreBall(6)" style="width:90px;height:70px;font-size:1.5rem;background:var(--success);color:#fff;font-weight:800;">6</button>
                <button class="btn" onclick="scoreBall(0, true)" style="width:90px;height:70px;font-size:1.5rem;background:var(--danger);color:#fff;font-weight:800;">OUT</button>
                <button class="btn" onclick="scoreBall(1, false, true)" style="width:90px;height:70px;font-size:1.5rem;background:var(--warning);color:#fff;">WD</button>
                <button class="btn" onclick="scoreBall(1, false, false, true)" style="width:90px;height:70px;font-size:1.5rem;background:var(--warning);color:#fff;">NB</button>
            </div>
        </div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
let selectedMatchId = null;
let selectedInningsId = null;
let selectedInnings = null;
let activeSlide = null;

// Read local storage configurations
window.addEventListener('DOMContentLoaded', () => {
    const savedMatch = localStorage.getItem('live_scoring_match_id');
    if (savedMatch) {
        document.getElementById('match-select').value = savedMatch;
        onMatchChange(savedMatch);
    }
});

async function onMatchChange(matchId) {
    selectedMatchId = matchId ? Number(matchId) : null;
    const innSelect = document.getElementById('innings-select');
    const qa = document.getElementById('quick-actions');
    const scoringSec = document.getElementById('scoring-section');
    const undoCont = document.getElementById('undo-container');

    if (!selectedMatchId) {
        localStorage.removeItem('live_scoring_match_id');
        innSelect.disabled = true;
        innSelect.innerHTML = '<option value="">Select Active Innings</option>';
        qa.classList.add('hidden');
        scoringSec.classList.add('hidden');
        undoCont.classList.add('hidden');
        return;
    }

    localStorage.setItem('live_scoring_match_id', matchId);
    innSelect.disabled = false;
    qa.classList.remove('hidden');

    await loadInningsList();
}

async function loadInningsList() {
    const innSelect = document.getElementById('innings-select');
    try {
        const res = await fetch(`${BASE}/api/innings.php?matchId=${selectedMatchId}`);
        const innings = await res.json();
        
        innSelect.innerHTML = '<option value="">Select Active Innings</option>' + 
            innings.map(i => `<option value="${i.id}">${i.battingTeam?.name} Innings #${i.inningsNumber}</option>`).join('');

        const savedInnings = localStorage.getItem(`live_scoring_innings_id_match_${selectedMatchId}`);
        if (savedInnings && innings.some(i => i.id === Number(savedInnings))) {
            innSelect.value = savedInnings;
            onInningsChange(savedInnings);
        } else {
            document.getElementById('scoring-section').classList.add('hidden');
            document.getElementById('undo-container').classList.add('hidden');
        }
    } catch(e) {
        console.error(e);
    }
}

async function startInnings(inningsNo) {
    const opt = document.getElementById('match-select').selectedOptions[0];
    const teamAId = opt.getAttribute('data-teama');
    const teamBId = opt.getAttribute('data-teamb');
    
    const battingTeamId = inningsNo === 1 ? teamAId : teamBId;
    const bowlingTeamId = inningsNo === 1 ? teamBId : teamAId;

    try {
        const res = await fetch(`${BASE}/api/innings.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matchId: selectedMatchId,
                battingTeamId: Number(battingTeamId),
                bowlingTeamId: Number(bowlingTeamId),
                inningsNumber: inningsNo
            })
        });
        if (res.ok) {
            const data = await res.json();
            alert(`Innings ${inningsNo} Started!`);
            await loadInningsList();
            document.getElementById('innings-select').value = data.id;
            onInningsChange(data.id);
        } else {
            alert('Failed to start innings.');
        }
    } catch(e) {
        console.error(e);
    }
}

async function onInningsChange(inningsId) {
    selectedInningsId = inningsId ? Number(inningsId) : null;
    const scoringSec = document.getElementById('scoring-section');
    const undoCont = document.getElementById('undo-container');

    if (!selectedInningsId) {
        localStorage.removeItem(`live_scoring_innings_id_match_${selectedMatchId}`);
        scoringSec.classList.add('hidden');
        undoCont.classList.add('hidden');
        return;
    }

    localStorage.setItem(`live_scoring_innings_id_match_${selectedMatchId}`, inningsId);
    scoringSec.classList.remove('hidden');
    undoCont.classList.remove('hidden');

    await fetchActiveSlide();
    await loadInningsState();
}

async function loadInningsState() {
    try {
        const res = await fetch(`${BASE}/api/live-score.php?id=${selectedInningsId}`);
        const data = await res.json();
        selectedInnings = data.innings;

        // Update displays
        document.getElementById('obs-batting-team').textContent = selectedInnings.battingTeam?.shortName || '';
        document.getElementById('obs-score').textContent = `${selectedInnings.runs}/${selectedInnings.wickets}`;
        document.getElementById('obs-overs').textContent = `(${selectedInnings.overs}.${selectedInnings.balls} Overs)`;

        document.getElementById('scoring-innings-badge').textContent = `${selectedInnings.battingTeam?.name} Innings`;
        document.getElementById('scoring-runs-wickets').textContent = `${selectedInnings.runs}/${selectedInnings.wickets}`;
        document.getElementById('scoring-overs').textContent = `(${selectedInnings.overs}.${selectedInnings.balls} Overs)`;

        // Set personnel drop downs
        document.getElementById('striker-select').value = selectedInnings.striker ? selectedInnings.striker.id : '';
        document.getElementById('nonstriker-select').value = selectedInnings.nonStriker ? selectedInnings.nonStriker.id : '';
        document.getElementById('bowler-select').value = selectedInnings.currentBowler ? selectedInnings.currentBowler.id : '';

        // Labels
        document.getElementById('active-striker-lbl').textContent = selectedInnings.striker ? selectedInnings.striker.name : 'Striker';
        document.getElementById('active-nonstriker-lbl').textContent = selectedInnings.nonStriker ? selectedInnings.nonStriker.name : 'Non-Striker';
        document.getElementById('active-bowler-lbl').textContent = selectedInnings.currentBowler ? selectedInnings.currentBowler.name : 'Bowler';

        // Check locks
        const isLocked = selectedInnings.completed;
        const banner = document.getElementById('lock-banner');
        const pad = document.getElementById('scoring-pad-card');
        if (isLocked) {
            banner.classList.remove('hidden');
            pad.style.opacity = '0.5';
            pad.querySelectorAll('button').forEach(b => b.disabled = true);
        } else {
            banner.classList.add('hidden');
            pad.style.opacity = '1';
            pad.querySelectorAll('button').forEach(b => b.disabled = false);
        }
    } catch(e) {
        console.error(e);
    }
}

async function updatePersonnel() {
    const striker = document.getElementById('striker-select').value;
    const nonStriker = document.getElementById('nonstriker-select').value;
    const bowler = document.getElementById('bowler-select').value;

    try {
        const res = await fetch(`${BASE}/api/innings.php?action=personnel&id=${selectedInningsId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                strikerId: striker ? Number(striker) : null,
                nonStrikerId: nonStriker ? Number(nonStriker) : null,
                bowlerId: bowler ? Number(bowler) : null
            })
        });
        if (res.ok) {
            await loadInningsState();
        }
    } catch(e) {
        console.error(e);
    }
}

async function scoreBall(runs, wicket = false, wide = false, noBall = false) {
    const striker = document.getElementById('striker-select').value;
    const nonStriker = document.getElementById('nonstriker-select').value;
    const bowler = document.getElementById('bowler-select').value;

    if (!striker || !nonStriker || !bowler) {
        alert('Please assign striker, non-striker, and bowler first.');
        return;
    }

    const payload = {
        inningsId: selectedInningsId,
        strikerId: Number(striker),
        nonStrikerId: Number(nonStriker),
        bowlerId: Number(bowler),
        runs: runs,
        isWicket: wicket ? 1 : 0,
        extraType: wide ? 'WIDE' : (noBall ? 'NO_BALL' : null),
        extraRuns: (wide || noBall) ? 1 : 0,
        overNumber: selectedInnings.overs,
        ballNumber: selectedInnings.balls + 1
    };

    try {
        const res = await fetch(`${BASE}/api/balls.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            await loadInningsState();
        } else {
            alert('Failed to record delivery.');
        }
    } catch(e) {
        console.error(e);
    }
}

async function handleUndo() {
    if (!confirm('Revert the last scored delivery? All stats will be automatically rolled back.')) return;
    try {
        const res = await fetch(`${BASE}/api/balls.php?action=undo&inningsId=${selectedInningsId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            await loadInningsState();
            alert('Last delivery undone!');
        } else {
            alert('Failed to undo last ball. Make sure there are balls to undo.');
        }
    } catch(e) {
        console.error(e);
    }
}

// OBS Overlays Management
async function fetchActiveSlide() {
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?active=1`);
        if (res.ok) {
            activeSlide = await res.json();
            updateObsBtnState();
        }
    } catch(e){}
}

function updateObsBtnState() {
    const btn = document.getElementById('obs-btn');
    const bar = document.getElementById('obs-bar');
    if (!activeSlide) {
        btn.textContent = '📺 No Active Scene';
        btn.style.background = '#64748b';
        bar.style.border = '1px solid var(--border-light)';
        bar.style.boxShadow = 'none';
        return;
    }
    
    let layout = [];
    try {
        layout = JSON.parse(activeSlide.overlayLayout || '[]');
    } catch(e){}
    
    const scoreboard = layout.find(el => el.type === 'scoreboard');
    const visible = scoreboard ? scoreboard.visible : false;
    
    if (visible) {
        btn.textContent = '❌ Remove from OBS';
        btn.style.background = '#ef4444';
        bar.style.border = '2px solid #10b981';
        bar.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.25)';
    } else {
        btn.textContent = '📺 Add to OBS Screen';
        btn.style.background = '#10b981';
        bar.style.border = '1px solid var(--border-light)';
        bar.style.boxShadow = 'none';
    }
}

async function toggleScoreboardOBS() {
    if (!activeSlide) {
        alert('Please activate a slide in Slides & Overlay studio first.');
        return;
    }
    
    let layout = [];
    try {
        layout = JSON.parse(activeSlide.overlayLayout || '[]');
    } catch(e){}
    
    const sbIndex = layout.findIndex(el => el.type === 'scoreboard');
    let nextVisible = true;
    
    if (sbIndex > -1) {
        nextVisible = !layout[sbIndex].visible;
        layout[sbIndex].visible = nextVisible;
    } else {
        layout.push({
            id: 'scoreboard_' + Date.now(),
            type: 'scoreboard',
            name: 'Live Scoreboard',
            x: 50,
            y: 85,
            width: 850,
            height: 60,
            zIndex: 50,
            visible: true
        });
    }
    
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?action=layout&id=${activeSlide.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
        });
        if (res.ok) {
            activeSlide.overlayLayout = JSON.stringify(layout);
            updateObsBtnState();
        }
    } catch(e) {
        console.error(e);
    }
}
</script>
<?php pageFooter(); ?>
