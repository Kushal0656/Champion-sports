<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/header.php';
pageHeader('Teams');
require_once __DIR__ . '/includes/sidebar.php';
$loggedIn = isAdminLoggedIn();
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">👥 <?= $loggedIn ? 'Teams Management' : 'Teams & Rosters' ?></h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">
                <?= $loggedIn ? 'Create and coordinate squads for tournaments.' : 'View team rosters and squad details.' ?>
            </p>
        </div>
        <div>
            <button class="btn btn-secondary" onclick="loadTeams()">🔄 Refresh List</button>
        </div>
    </div>

    <?php if ($loggedIn): ?>
    <!-- Create Team Card -->
    <div class="premium-card" style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">✨ Create New Team</h2>
        <form id="create-team-form" style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;" enctype="multipart/form-data">
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Team Name</label>
                    <input type="text" name="name" class="form-input" placeholder="e.g. Royal Challengers Bangalore" required>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Short Name (Abbreviation)</label>
                    <input type="text" name="shortName" class="form-input" placeholder="e.g. RCB" required>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:1.5rem;">
                <div class="form-group" style="margin-bottom:0;flex:1;">
                    <label class="form-label">Team Logo</label>
                    <input type="file" name="logo" class="form-input" accept="image/*">
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top:1.5rem;align-self:stretch;">➕ Add Team</button>
            </div>
        </form>
    </div>
    <?php endif; ?>

    <!-- Teams Grid -->
    <div class="grid-3" id="teams-grid">
        <div style="grid-column:span 3;text-align:center;padding:3rem;color:var(--text-muted);">Loading teams...</div>
    </div>
</div>

<!-- Modal for Team Details / Roster -->
<div id="details-modal" class="modal-backdrop hidden" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 id="modal-title" style="margin:0;font-size:1.4rem;">Team Roster</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeModal(event)" style="padding:.25rem .5rem;">✕</button>
        </div>
        <div id="modal-body">
            <!-- Details go here -->
        </div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
const loggedIn = <?= $loggedIn ? 'true' : 'false' ?>;
let allTeams = [];

async function loadTeams() {
    try {
        const grid = document.getElementById('teams-grid');
        const res = await fetch(`${BASE}/api/teams.php`);
        allTeams = await res.json();
        
        if (allTeams.length === 0) {
            grid.innerHTML = '<div style="grid-column:span 3;text-align:center;padding:3rem;color:var(--text-muted);">No teams created yet.</div>';
            return;
        }

        grid.innerHTML = allTeams.map(team => `
            <div class="premium-card team-card" style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:1.75rem;">
                <div style="width:80px;height:80px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;margin-bottom:1rem;overflow:hidden;border:1px solid var(--border-light);">
                    ${team.logoUrl ? `<img src="${team.logoUrl}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:2rem;">👥</span>`}
                </div>
                <h3 style="margin:0 0 .25rem;font-size:1.15rem;">${escapeHtml(team.name)}</h3>
                <span class="badge badge-primary" style="margin-bottom:1.25rem;">${escapeHtml(team.shortName)}</span>
                
                <div style="display:flex;gap:.5rem;width:100%;margin-top:auto;">
                    <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="viewRoster(${team.id})">📋 View Roster</button>
                    ${loggedIn ? `<button class="btn btn-danger btn-sm" onclick="deleteTeam(${team.id})">🗑️ Delete</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch(e) {
        console.error(e);
        document.getElementById('teams-grid').innerHTML = '<div style="grid-column:span 3;text-align:center;padding:3rem;color:var(--danger);">Failed to load teams.</div>';
    }
}

if (loggedIn) {
    document.getElementById('create-team-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            const res = await fetch(`${BASE}/api/teams.php`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                e.target.reset();
                loadTeams();
            } else {
                alert('Failed to create team');
            }
        } catch(err) {
            console.error(err);
            alert('Failed to create team');
        }
    });
}

async function deleteTeam(id) {
    if (!confirm('Are you sure you want to delete this team? All player assignments to this team will be cleared.')) return;
    try {
        const res = await fetch(`${BASE}/api/teams.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadTeams();
        } else {
            alert('Failed to delete team');
        }
    } catch(err) {
        console.error(err);
    }
}

let activeTeamId = null;
async function viewRoster(teamId) {
    activeTeamId = teamId;
    const team = allTeams.find(t => t.id === teamId);
    document.getElementById('modal-title').textContent = `${team.name} Roster`;
    
    const modal = document.getElementById('details-modal');
    modal.classList.remove('hidden');
    
    await loadRosterData();
}

async function loadRosterData() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">Loading players...</div>';
    
    try {
        const res = await fetch(`${BASE}/api/players.php?teamId=${activeTeamId}`);
        const players = await res.json();
        
        let html = '';
        if (loggedIn) {
            html += `
                <div style="background:#f8fafc;padding:1rem;border-radius:12px;border:1px solid var(--border-light);margin-bottom:1.5rem;">
                    <h4 style="margin:0 0 .5rem;font-size:.9rem;color:var(--text-secondary);">Assign Player by Jersey Number</h4>
                    <div style="display:flex;gap:.5rem;">
                        <input type="number" id="search-jersey" class="form-input" style="padding:.5rem;font-size:.9rem;" placeholder="Jersey #">
                        <button class="btn btn-primary btn-sm" onclick="assignPlayer()">Assign</button>
                    </div>
                    <div id="search-feedback" style="margin-top:.4rem;font-size:.8rem;"></div>
                </div>
            `;
        }
        
        if (players.length === 0) {
            html += '<p style="text-align:center;color:var(--text-muted);padding:1rem;">No players in this squad yet.</p>';
        } else {
            html += `
                <div class="table-container" style="margin:0;max-height:300px;overflow-y:auto;">
                    <table class="premium-table" style="font-size:.9rem;">
                        <thead>
                            <tr>
                                <th>Photo</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Jersey #</th>
                                ${loggedIn ? '<th>Action</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${players.map(p => `
                                <tr>
                                    <td style="padding:.5rem 1rem;">
                                        <div style="width:36px;height:36px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border-light);">
                                            ${p.photoUrl ? `<img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                                        </div>
                                    </td>
                                    <td style="padding:.5rem 1rem;"><strong>${escapeHtml(p.name)}</strong></td>
                                    <td style="padding:.5rem 1rem;">${escapeHtml(p.role)}</td>
                                    <td style="padding:.5rem 1rem;"><span class="badge badge-secondary" style="background:#f1f5f9;color:var(--text-secondary);">${p.jerseyNumber ?? '—'}</span></td>
                                    ${loggedIn ? `<td style="padding:.5rem 1rem;"><button class="btn btn-danger btn-sm" style="padding:.2rem .5rem;font-size:.75rem;" onclick="removePlayer(${p.id}, '${escapeJs(p.name)}', '${escapeJs(p.role)}', ${p.jerseyNumber})">Cleave</button></td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        body.innerHTML = html;
    } catch(err) {
        console.error(err);
        body.innerHTML = '<p style="text-align:center;color:var(--danger);">Error loading roster.</p>';
    }
}

async function assignPlayer() {
    const jerseyInput = document.getElementById('search-jersey');
    const feedback = document.getElementById('search-feedback');
    const num = Number(jerseyInput.value);
    
    if (!num) {
        feedback.style.color = 'var(--danger)';
        feedback.textContent = 'Please enter a valid jersey number.';
        return;
    }
    
    feedback.style.color = 'var(--text-muted)';
    feedback.textContent = 'Searching...';
    
    try {
        const res = await fetch(`${BASE}/api/players.php`);
        const all = await res.json();
        const match = all.find(p => p.jerseyNumber === num);
        
        if (!match) {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'No player found with this jersey number.';
            return;
        }
        
        // Update player's team via PUT
        const putRes = await fetch(`${BASE}/api/players.php?id=${match.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: match.name,
                role: match.role,
                jerseyNumber: match.jerseyNumber,
                teamId: activeTeamId
            })
        });
        
        if (putRes.ok) {
            feedback.style.color = 'var(--success)';
            feedback.textContent = `Assigned ${match.name} successfully!`;
            jerseyInput.value = '';
            loadRosterData();
        } else {
            feedback.style.color = 'var(--danger)';
            feedback.textContent = 'Failed to assign player.';
        }
    } catch(err) {
        console.error(err);
        feedback.style.color = 'var(--danger)';
        feedback.textContent = 'An error occurred.';
    }
}

async function removePlayer(playerId, name, role, jerseyNumber) {
    if (!confirm(`Are you sure you want to remove ${name} from this team?`)) return;
    try {
        const res = await fetch(`${BASE}/api/players.php?id=${playerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                role: role,
                jerseyNumber: jerseyNumber,
                teamId: null
            })
        });
        if (res.ok) {
            loadRosterData();
        } else {
            alert('Failed to remove player');
        }
    } catch(err) {
        console.error(err);
    }
}

function closeModal(e) {
    document.getElementById('details-modal').classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeJs(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

loadTeams();
</script>
<?php pageFooter(); ?>
