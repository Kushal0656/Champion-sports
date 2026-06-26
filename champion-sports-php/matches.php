<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/header.php';
pageHeader('Matches');
require_once __DIR__ . '/includes/sidebar.php';

$loggedIn = isAdminLoggedIn();
$db = getDB();
$teams = $db->query("SELECT id, name FROM teams ORDER BY name")->fetchAll();
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">🏏 <?= $loggedIn ? 'Matches Management' : 'Matches & Fixtures' ?></h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">
                <?= $loggedIn ? 'Schedule and update match statuses and betting odds.' : 'View current, upcoming, and finished matches.' ?>
            </p>
        </div>
        <div>
            <button class="btn btn-secondary" onclick="loadMatches()">🔄 Refresh List</button>
        </div>
    </div>

    <?php if ($loggedIn): ?>
    <!-- Create Match Card -->
    <div class="premium-card" style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">✨ Schedule New Match</h2>
        <form id="create-match-form" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;align-items:end;">
            <div class="form-group">
                <label class="form-label">Team A</label>
                <select name="teamAId" class="form-select" required>
                    <option value="">Select Team A</option>
                    <?php foreach ($teams as $team): ?>
                        <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Team B</label>
                <select name="teamBId" class="form-select" required>
                    <option value="">Select Team B</option>
                    <?php foreach ($teams as $team): ?>
                        <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Venue</label>
                <input type="text" name="venue" class="form-input" placeholder="e.g. Wankhede Stadium" required>
            </div>
            <div class="form-group">
                <label class="form-label">Match Date & Time</label>
                <input type="datetime-local" name="matchDate" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Stream URL (Optional)</label>
                <input type="url" name="streamUrl" class="form-input" placeholder="e.g. YouTube URL">
            </div>
            <button type="submit" class="btn btn-primary" style="height:42px;">🏏 Schedule</button>
        </form>
    </div>
    <?php endif; ?>

    <!-- Matches Table -->
    <div class="premium-card" style="padding:1.5rem;">
        <h2 style="font-size:1.2rem;margin-bottom:1rem;">📅 Matches Schedule</h2>
        <div class="table-container" style="margin:0;">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Match</th>
                        <th>Venue</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Live Odds</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="matches-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading matches...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Edit Match Modal -->
<div id="edit-modal" class="modal-backdrop hidden" onclick="closeModal('edit-modal', event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 style="margin:0;font-size:1.3rem;">✏️ Edit Match</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeModal('edit-modal', event)" style="padding:.25rem .5rem;">✕</button>
        </div>
        <form id="edit-match-form" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
            <input type="hidden" id="edit-match-id">
            <div class="form-group">
                <label class="form-label">Team A</label>
                <select id="edit-match-teama" class="form-select" required>
                    <?php foreach ($teams as $team): ?>
                        <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Team B</label>
                <select id="edit-match-teamb" class="form-select" required>
                    <?php foreach ($teams as $team): ?>
                        <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Venue</label>
                <input type="text" id="edit-match-venue" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Date & Time</label>
                <input type="datetime-local" id="edit-match-date" class="form-input" required>
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label class="form-label">Stream URL</label>
                <input type="url" id="edit-match-stream" class="form-input">
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="edit-match-status" class="form-select" required>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="LIVE">Live</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Current Innings</label>
                <input type="number" id="edit-match-innings" class="form-input" min="1" max="2">
            </div>
            
            <div style="grid-column: span 2; border-top: 1px solid var(--border-light); padding-top: 1rem; margin-top: .5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                    <label class="form-label">Toss Winner</label>
                    <select id="edit-match-tosswin" class="form-select">
                        <option value="">Select Winner</option>
                        <?php foreach ($teams as $team): ?>
                            <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Toss Decision</label>
                    <select id="edit-match-tossdec" class="form-select">
                        <option value="">Select Decision</option>
                        <option value="BAT">Batting</option>
                        <option value="BOWL">Bowling</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Winner</label>
                    <select id="edit-match-winner" class="form-select">
                        <option value="">No Winner Yet</option>
                        <?php foreach ($teams as $team): ?>
                            <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Result Margin</label>
                    <input type="text" id="edit-match-margin" class="form-input" placeholder="e.g. Won by 5 runs">
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary" style="grid-column: span 2; margin-top: .5rem;">💾 Save Changes</button>
        </form>
    </div>
</div>

<!-- Odds Management Modal -->
<div id="odds-modal" class="modal-backdrop hidden" onclick="closeModal('odds-modal', event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 style="margin:0;font-size:1.3rem;">📊 Configure Match Odds</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeModal('odds-modal', event)" style="padding:.25rem .5rem;">✕</button>
        </div>
        <form id="odds-form" style="display:flex;flex-direction:column;gap:1rem;">
            <input type="hidden" id="odds-match-id">
            <div style="background:#f8fafc;padding:1rem;border-radius:12px;border:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:.85rem;color:var(--text-secondary);font-weight:700;">Calculate Odds via Performance Heuristics:</span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="calculatePerformanceOdds()">⚡ Calculate</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div class="form-group">
                    <label class="form-label" id="label-team-a">Team A Odds</label>
                    <input type="number" step="0.01" id="odds-team-a" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" id="label-team-b">Team B Odds</label>
                    <input type="number" step="0.01" id="odds-team-b" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Draw Odds</label>
                    <input type="number" step="0.01" id="odds-draw" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Bookmaker Odds</label>
                    <input type="number" step="0.01" id="odds-bookmaker" class="form-input" required>
                </div>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:.5rem;">💾 Save Odds</button>
        </form>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
const loggedIn = <?= $loggedIn ? 'true' : 'false' ?>;
let allMatches = [];
let allOdds = {};

async function loadMatches() {
    try {
        const tbody = document.getElementById('matches-tbody');
        const res = await fetch(`${BASE}/api/matches.php`);
        allMatches = await res.json();
        
        if (allMatches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No matches found.</td></tr>';
            return;
        }

        // Fetch odds for all matches
        await Promise.all(allMatches.map(async m => {
            try {
                const oddsRes = await fetch(`${BASE}/api/match-odds.php?matchId=${m.id}`);
                if (oddsRes.ok) {
                    allOdds[m.id] = await oddsRes.json();
                }
            } catch(e){}
        }));

        tbody.innerHTML = allMatches.map(m => {
            const odds = allOdds[m.id];
            const oddsText = odds ? `A: <strong>${odds.teamAOdds}</strong> | B: <strong>${odds.teamBOdds}</strong>` : '—';
            return `
                <tr>
                    <td>
                        <div style="display:flex;align-items:center;gap:.75rem;">
                            <div style="font-weight:800;font-size:1rem;color:var(--primary);">${m.teamA ? escapeHtml(m.teamA.shortName) : 'TBD'}</div>
                            <div style="font-size:.8rem;color:var(--text-muted);font-weight:700;">VS</div>
                            <div style="font-weight:800;font-size:1rem;color:var(--success);">${m.teamB ? escapeHtml(m.teamB.shortName) : 'TBD'}</div>
                        </div>
                        <div style="font-size:.8rem;color:var(--text-muted);margin-top:.2rem;">${escapeHtml(m.teamA?.name || 'TBD')} vs ${escapeHtml(m.teamB?.name || 'TBD')}</div>
                    </td>
                    <td>${escapeHtml(m.venue)}</td>
                    <td>${m.matchDate ? new Date(m.matchDate).toLocaleString('en-IN') : '—'}</td>
                    <td>${statusBadge(m.status)}</td>
                    <td><span class="badge badge-secondary" style="background:#eef2ff;color:var(--primary);font-weight:600;">${oddsText}</span></td>
                    <td>
                        <div style="display:flex;gap:.4rem;">
                            <a href="${BASE}/scorecard.php?matchId=${m.id}" class="btn btn-secondary btn-sm">📋 Scorecard</a>
                            ${loggedIn ? `
                                <button class="btn btn-secondary btn-sm" onclick="openEditModal(${m.id})">✏️ Edit</button>
                                <button class="btn btn-secondary btn-sm" onclick="openOddsModal(${m.id})">📊 Odds</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteMatch(${m.id})">🗑️</button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        console.error(err);
        document.getElementById('matches-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger);">Failed to load matches.</td></tr>';
    }
}

function statusBadge(status) {
    if (status === 'LIVE') return '<span class="badge live-badge"><span class="live-dot"></span>LIVE</span>';
    if (status === 'COMPLETED') return '<span class="badge badge-danger">Completed</span>';
    return '<span class="badge badge-warning">Scheduled</span>';
}

if (loggedIn) {
    document.getElementById('create-match-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            teamAId: Number(e.target.teamAId.value),
            teamBId: Number(e.target.teamBId.value),
            venue: e.target.venue.value,
            matchDate: e.target.matchDate.value,
            streamUrl: e.target.streamUrl.value || null,
            status: 'SCHEDULED'
        };
        try {
            const res = await fetch(`${BASE}/api/matches.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                e.target.reset();
                loadMatches();
            } else {
                alert('Failed to create match');
            }
        } catch(err) {
            console.error(err);
        }
    });
}

function openEditModal(id) {
    const m = allMatches.find(x => x.id === id);
    if (!m) return;
    
    document.getElementById('edit-match-id').value = m.id;
    document.getElementById('edit-match-teama').value = m.teamA ? m.teamA.id : '';
    document.getElementById('edit-match-teamb').value = m.teamB ? m.teamB.id : '';
    document.getElementById('edit-match-venue').value = m.venue;
    
    // Format date for datetime-local (YYYY-MM-DDTHH:MM)
    if (m.matchDate) {
        const d = new Date(m.matchDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        document.getElementById('edit-match-date').value = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } else {
        document.getElementById('edit-match-date').value = '';
    }
    
    document.getElementById('edit-match-stream').value = m.streamUrl || '';
    document.getElementById('edit-match-status').value = m.status;
    document.getElementById('edit-match-innings').value = m.currentInnings || 1;
    document.getElementById('edit-match-tosswin').value = m.tossWinner ? m.tossWinner.id : '';
    document.getElementById('edit-match-tossdec').value = m.tossDecision || '';
    document.getElementById('edit-match-winner').value = m.winner ? m.winner.id : '';
    document.getElementById('edit-match-margin').value = m.resultMargin || '';
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

document.getElementById('edit-match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-match-id').value;
    const data = {
        teamAId: Number(document.getElementById('edit-match-teama').value),
        teamBId: Number(document.getElementById('edit-match-teamb').value),
        venue: document.getElementById('edit-match-venue').value,
        matchDate: document.getElementById('edit-match-date').value,
        streamUrl: document.getElementById('edit-match-stream').value || null,
        status: document.getElementById('edit-match-status').value,
        currentInnings: Number(document.getElementById('edit-match-innings').value),
        tossWinnerId: document.getElementById('edit-match-tosswin').value ? Number(document.getElementById('edit-match-tosswin').value) : null,
        tossDecision: document.getElementById('edit-match-tossdec').value || null,
        winnerId: document.getElementById('edit-match-winner').value ? Number(document.getElementById('edit-match-winner').value) : null,
        resultMargin: document.getElementById('edit-match-margin').value || null
    };
    
    try {
        const res = await fetch(`${BASE}/api/matches.php?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('edit-modal');
            loadMatches();
        } else {
            alert('Failed to save changes');
        }
    } catch(err) {
        console.error(err);
    }
});

function openOddsModal(id) {
    const m = allMatches.find(x => x.id === id);
    if (!m) return;
    
    document.getElementById('odds-match-id').value = id;
    document.getElementById('label-team-a').textContent = `${m.teamA?.shortName || 'Team A'} Odds`;
    document.getElementById('label-team-b').textContent = `${m.teamB?.shortName || 'Team B'} Odds`;
    
    const odds = allOdds[id] || { teamAOdds: 1.90, teamBOdds: 1.90, drawOdds: 4.00, bookmakerOdds: 1.90 };
    document.getElementById('odds-team-a').value = odds.teamAOdds;
    document.getElementById('odds-team-b').value = odds.teamBOdds;
    document.getElementById('odds-draw').value = odds.drawOdds;
    document.getElementById('odds-bookmaker').value = odds.bookmakerOdds;
    
    document.getElementById('odds-modal').classList.remove('hidden');
}

async function calculatePerformanceOdds() {
    const id = document.getElementById('odds-match-id').value;
    try {
        const res = await fetch(`${BASE}/api/match-odds.php?action=calculate&matchId=${id}`);
        if (res.ok) {
            const data = await res.json();
            document.getElementById('odds-team-a').value = data.teamAOdds;
            document.getElementById('odds-team-b').value = data.teamBOdds;
            document.getElementById('odds-draw').value = data.drawOdds;
            document.getElementById('odds-bookmaker').value = data.bookmakerOdds;
        } else {
            alert('Failed to calculate performance odds');
        }
    } catch(e) {
        console.error(e);
    }
}

document.getElementById('odds-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('odds-match-id').value;
    const data = {
        teamAOdds: Number(document.getElementById('odds-team-a').value),
        teamBOdds: Number(document.getElementById('odds-team-b').value),
        drawOdds: Number(document.getElementById('odds-draw').value),
        bookmakerOdds: Number(document.getElementById('odds-bookmaker').value)
    };
    
    try {
        const res = await fetch(`${BASE}/api/match-odds.php?matchId=${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal('odds-modal');
            loadMatches();
        } else {
            alert('Failed to save odds');
        }
    } catch(err) {
        console.error(err);
    }
});

async function deleteMatch(id) {
    if (!confirm('Are you sure you want to delete this match? All innings and deliveries will be permanently deleted.')) return;
    try {
        const res = await fetch(`${BASE}/api/matches.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadMatches();
        } else {
            alert('Failed to delete match');
        }
    } catch(err) {
        console.error(err);
    }
}

function closeModal(modalId, e) {
    document.getElementById(modalId).classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

loadMatches();
</script>
<?php pageFooter(); ?>
