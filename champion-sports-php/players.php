<?php
require_once __DIR__ . '/includes/auth.php';
requireAdmin(); // Admin only page
require_once __DIR__ . '/includes/header.php';
pageHeader('Manage Players');
require_once __DIR__ . '/includes/sidebar.php';

$db = getDB();
$teams = $db->query("SELECT id, name FROM teams ORDER BY name")->fetchAll();
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">👤 Players Management</h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">Create, edit, and manage cricket players and squad affiliations.</p>
        </div>
        <div>
            <button class="btn btn-secondary" onclick="loadPlayers()">🔄 Refresh List</button>
        </div>
    </div>

    <!-- Create Player Card -->
    <div class="premium-card" style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">✨ Create New Player</h2>
        <form id="create-player-form" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;align-items:end;" enctype="multipart/form-data">
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" name="name" class="form-input" placeholder="e.g. Virat Kohli" required>
            </div>
            <div class="form-group">
                <label class="form-label">Role</label>
                <select name="role" class="form-select" required>
                    <option value="">Select Role</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Jersey Number</label>
                <input type="number" name="jerseyNumber" class="form-input" placeholder="e.g. 18" required>
            </div>
            <div class="form-group">
                <label class="form-label">Team Assignment</label>
                <select name="teamId" class="form-select">
                    <option value="">No Team / Free Agent</option>
                    <?php foreach ($teams as $team): ?>
                        <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Profile Photo</label>
                <input type="file" name="photo" class="form-input" accept="image/*">
            </div>
            <button type="submit" class="btn btn-primary" style="height:42px;">➕ Add Player</button>
        </form>
    </div>

    <!-- Players Table -->
    <div class="premium-card" style="padding:1.5rem;">
        <h2 style="font-size:1.2rem;margin-bottom:1rem;">📋 Active Players Roster</h2>
        <div class="table-container" style="margin:0;">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>Photo</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Jersey #</th>
                        <th>Current Team</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="players-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading players...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Edit Player Modal -->
<div id="edit-modal" class="modal-backdrop hidden" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 style="margin:0;font-size:1.3rem;">📝 Edit Player Details</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeModal(event)" style="padding:.25rem .5rem;">✕</button>
        </div>
        <form id="edit-player-form" style="display:flex;flex-direction:column;gap:1rem;">
            <input type="hidden" id="edit-player-id">
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="edit-player-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Role</label>
                <select id="edit-player-role" class="form-select" required>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Jersey Number</label>
                <input type="number" id="edit-player-jersey" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Team Assignment</label>
                <select id="edit-player-team" class="form-select">
                    <option value="">No Team / Free Agent</option>
                    <?php foreach ($teams as $team): ?>
                        <option value="<?= $team['id'] ?>"><?= htmlspecialchars($team['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:.5rem;">💾 Save Changes</button>
        </form>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
let allPlayers = [];

async function loadPlayers() {
    try {
        const tbody = document.getElementById('players-tbody');
        const res = await fetch(`${BASE}/api/players.php`);
        allPlayers = await res.json();
        
        if (allPlayers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No players found.</td></tr>';
            return;
        }

        tbody.innerHTML = allPlayers.map(p => `
            <tr>
                <td>
                    <div style="width:40px;height:40px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border-light);">
                        ${p.photoUrl ? `<img src="${p.photoUrl}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                    </div>
                </td>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${escapeHtml(p.role)}</td>
                <td><span class="badge badge-secondary" style="background:#f1f5f9;color:var(--text-secondary);font-weight:700;">${p.jerseyNumber ?? '—'}</span></td>
                <td>${p.team ? `<span class="badge badge-primary">${escapeHtml(p.team.name)}</span>` : '<span style="color:var(--text-muted);font-style:italic;">Free Agent</span>'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${p.id})">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deletePlayer(${p.id})">🗑️ Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(err) {
        console.error(err);
        document.getElementById('players-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger);">Failed to load players.</td></tr>';
    }
}

document.getElementById('create-player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${BASE}/api/players.php`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            e.target.reset();
            loadPlayers();
        } else {
            alert('Failed to add player');
        }
    } catch(err) {
        console.error(err);
    }
});

function openEditModal(id) {
    const p = allPlayers.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('edit-player-id').value = p.id;
    document.getElementById('edit-player-name').value = p.name;
    document.getElementById('edit-player-role').value = p.role;
    document.getElementById('edit-player-jersey').value = p.jerseyNumber || '';
    document.getElementById('edit-player-team').value = p.team ? p.team.id : '';
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

document.getElementById('edit-player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-player-id').value;
    const data = {
        name: document.getElementById('edit-player-name').value,
        role: document.getElementById('edit-player-role').value,
        jerseyNumber: Number(document.getElementById('edit-player-jersey').value),
        teamId: document.getElementById('edit-player-team').value ? Number(document.getElementById('edit-player-team').value) : null
    };
    
    try {
        const res = await fetch(`${BASE}/api/players.php?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal();
            loadPlayers();
        } else {
            alert('Failed to save changes');
        }
    } catch(err) {
        console.error(err);
    }
});

async function deletePlayer(id) {
    if (!confirm('Are you sure you want to delete this player?')) return;
    try {
        const res = await fetch(`${BASE}/api/players.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadPlayers();
        } else {
            alert('Failed to delete player');
        }
    } catch(err) {
        console.error(err);
    }
}

function closeModal(e) {
    document.getElementById('edit-modal').classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

loadPlayers();
</script>
<?php pageFooter(); ?>
