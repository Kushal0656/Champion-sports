<?php
require_once __DIR__ . '/includes/auth.php';
requireAdmin(); // Admin only
require_once __DIR__ . '/includes/header.php';
pageHeader('Tournament Teams');
require_once __DIR__ . '/includes/sidebar.php';

$db = getDB();
$tournaments = $db->query("SELECT id, name FROM tournaments ORDER BY id DESC")->fetchAll();
$teams = $db->query("SELECT id, name, short_name, logo_path FROM teams ORDER BY name")->fetchAll();
?>
<div class="main-content">
    <div style="margin-bottom:2rem;border-bottom:1px solid var(--border-light);padding-bottom:1.25rem;">
        <h1 style="margin:0;font-size:1.75rem;">🤝 Tournament Teams Association</h1>
        <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">Manage participating squads for each tournament series.</p>
    </div>

    <div class="grid-3" style="grid-template-columns: 350px 1fr; gap: 2rem; align-items: start;">
        <!-- Selector Panel -->
        <div class="premium-card" style="padding:1.5rem;position:sticky;top:2.5rem;">
            <h2 style="font-size:1.2rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">🔍 Select Series</h2>
            <div class="form-group">
                <label class="form-label">Active Tournament</label>
                <select id="tour-select" class="form-select" onchange="onTournamentChange(this.value)">
                    <option value="">-- Choose Tournament --</option>
                    <?php foreach ($tournaments as $tour): ?>
                        <option value="<?= $tour['id'] ?>"><?= htmlspecialchars($tour['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div style="margin-top:1.5rem;border-top:1px solid var(--border-light);padding-top:1.25rem;">
                <p style="font-size:.82rem;color:var(--text-muted);line-height:1.5;margin:0;">
                    Select a tournament from the dropdown to manage its roster. Check the teams on the right that will participate in this series. Unchecking a team will remove it from the series.
                </p>
            </div>
        </div>

        <!-- Association Panel -->
        <div class="premium-card" style="padding:2rem;">
            <h2 style="font-size:1.2rem;margin-bottom:1.25rem;">👥 Participating Teams</h2>
            <div id="association-body">
                <div style="text-align:center;padding:3rem;color:var(--text-muted);font-style:italic;">
                    Please select a tournament from the left panel to display participating teams.
                </div>
            </div>
        </div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
const allSystemTeams = <?= json_encode(array_map(fn($t) => [
    'id' => (int)$t['id'],
    'name' => $t['name'],
    'shortName' => $t['short_name'],
    'logoUrl' => $t['logo_path'] ? SITE_URL . '/uploads/teams/' . $t['logo_path'] : null
], $teams)) ?>;

let activeTourId = null;
let activeAssociations = [];

async function onTournamentChange(tourId) {
    activeTourId = tourId ? Number(tourId) : null;
    const body = document.getElementById('association-body');
    
    if (!activeTourId) {
        body.innerHTML = `
            <div style="text-align:center;padding:3rem;color:var(--text-muted);font-style:italic;">
                Please select a tournament from the left panel to display participating teams.
            </div>`;
        return;
    }
    
    body.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted);">Loading configurations...</div>';
    
    try {
        const res = await fetch(`${BASE}/api/tournament-teams.php?tournamentId=${activeTourId}`);
        activeAssociations = await res.json();
        renderTeamsGrid();
    } catch(err) {
        console.error(err);
        body.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--danger);">Failed to load associations.</div>';
    }
}

function renderTeamsGrid() {
    const body = document.getElementById('association-body');
    if (allSystemTeams.length === 0) {
        body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">No teams created in the system yet. Go to Teams page first.</div>';
        return;
    }
    
    body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:1rem;">
            ${allSystemTeams.map(team => {
                const assoc = activeAssociations.find(a => a.team.id === team.id);
                const isChecked = !!assoc;
                return `
                    <label class="premium-card" style="display:flex;align-items:center;gap:1rem;padding:1rem;cursor:pointer;user-select:none;border:${isChecked ? '2px solid var(--primary)' : '1px solid var(--border-light)'};">
                        <input type="checkbox" style="width:18px;height:18px;accent-color:var(--primary);" 
                               ${isChecked ? 'checked' : ''} 
                               onchange="toggleAssociation(${team.id}, ${assoc ? assoc.id : 'null'}, this)">
                        <div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border-light);">
                            ${team.logoUrl ? `<img src="${team.logoUrl}" style="width:100%;height:100%;object-fit:cover;">` : '👥'}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(team.name)}</div>
                            <div style="font-size:.78rem;color:var(--text-muted);font-weight:600;">${escapeHtml(team.shortName)}</div>
                        </div>
                    </label>
                `;
            }).join('')}
        </div>
    `;
}

async function toggleAssociation(teamId, assocId, checkbox) {
    checkbox.disabled = true;
    try {
        if (checkbox.checked) {
            // Add mapping
            const res = await fetch(`${BASE}/api/tournament-teams.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: activeTourId, teamId: teamId })
            });
            if (res.ok) {
                // Refresh assoc list
                const assoc = await res.json();
                activeAssociations.push(assoc);
            } else {
                checkbox.checked = false;
                alert('Failed to map team.');
            }
        } else {
            // Remove mapping
            if (!assocId) {
                // Find assocId dynamically if it was just added without page reload
                const assoc = activeAssociations.find(a => a.team.id === teamId);
                assocId = assoc ? assoc.id : null;
            }
            if (assocId) {
                const res = await fetch(`${BASE}/api/tournament-teams.php?id=${assocId}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    activeAssociations = activeAssociations.filter(a => a.id !== assocId);
                } else {
                    checkbox.checked = true;
                    alert('Failed to remove team mapping.');
                }
            }
        }
        renderTeamsGrid();
    } catch(err) {
        console.error(err);
        checkbox.checked = !checkbox.checked;
        alert('An error occurred.');
    } finally {
        checkbox.disabled = false;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
</script>
<?php pageFooter(); ?>
