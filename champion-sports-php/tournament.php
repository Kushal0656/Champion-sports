<?php
require_once __DIR__ . '/includes/auth.php';
requireAdmin(); // Admin only
require_once __DIR__ . '/includes/header.php';
pageHeader('Manage Tournaments');
require_once __DIR__ . '/includes/sidebar.php';
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">🏆 Tournaments Management</h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">Schedule, activate, or conclude cricket tournament series.</p>
        </div>
        <div>
            <button class="btn btn-secondary" onclick="loadTournaments()">🔄 Refresh List</button>
        </div>
    </div>

    <!-- Create Tournament Card -->
    <div class="premium-card" style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">✨ Create New Tournament</h2>
        <form id="create-tournament-form" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;align-items:end;">
            <div class="form-group">
                <label class="form-label">Tournament Name</label>
                <input type="text" name="name" class="form-input" placeholder="e.g. Indian Premier League 2026" required>
            </div>
            <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" name="startDate" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="date" name="endDate" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select name="status" class="form-select" required>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary" style="height:42px;">🏆 Create Series</button>
        </form>
    </div>

    <!-- Tournaments Table -->
    <div class="premium-card" style="padding:1.5rem;">
        <h2 style="font-size:1.2rem;margin-bottom:1rem;">📋 Active & Scheduled Series</h2>
        <div class="table-container" style="margin:0;">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="tournaments-tbody">
                    <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading tournaments...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Edit Tournament Modal -->
<div id="edit-modal" class="modal-backdrop hidden" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 style="margin:0;font-size:1.3rem;">📝 Edit Tournament</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeModal(event)" style="padding:.25rem .5rem;">✕</button>
        </div>
        <form id="edit-tournament-form" style="display:flex;flex-direction:column;gap:1rem;">
            <input type="hidden" id="edit-tour-id">
            <div class="form-group">
                <label class="form-label">Tournament Name</label>
                <input type="text" id="edit-tour-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" id="edit-tour-start" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">End Date</label>
                <input type="date" id="edit-tour-end" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="edit-tour-status" class="form-select" required>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:.5rem;">💾 Save Changes</button>
        </form>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
let allTournaments = [];

async function loadTournaments() {
    try {
        const tbody = document.getElementById('tournaments-tbody');
        const res = await fetch(`${BASE}/api/tournaments.php`);
        allTournaments = await res.json();
        
        if (allTournaments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">No tournaments found.</td></tr>';
            return;
        }

        tbody.innerHTML = allTournaments.map(t => `
            <tr>
                <td>#${t.id}</td>
                <td><strong>${escapeHtml(t.name)}</strong></td>
                <td>${t.startDate ? new Date(t.startDate).toLocaleDateString('en-IN') : '—'}</td>
                <td>${t.endDate ? new Date(t.endDate).toLocaleDateString('en-IN') : '—'}</td>
                <td>${statusBadge(t.status)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openEditModal(${t.id})">✏️ Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTournament(${t.id})">🗑️ Delete</button>
                </td>
            </tr>
        `).join('');
    } catch(err) {
        console.error(err);
        document.getElementById('tournaments-tbody').innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--danger);">Failed to load tournaments.</td></tr>';
    }
}

function statusBadge(status) {
    if (status === 'ACTIVE') return '<span class="badge badge-success">Active</span>';
    if (status === 'COMPLETED') return '<span class="badge badge-danger">Completed</span>';
    return '<span class="badge badge-warning">Upcoming</span>';
}

document.getElementById('create-tournament-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name: e.target.name.value,
        startDate: e.target.startDate.value,
        endDate: e.target.endDate.value,
        status: e.target.status.value
    };
    try {
        const res = await fetch(`${BASE}/api/tournaments.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            e.target.reset();
            loadTournaments();
        } else {
            alert('Failed to create tournament');
        }
    } catch(err) {
        console.error(err);
    }
});

function openEditModal(id) {
    const t = allTournaments.find(x => x.id === id);
    if (!t) return;
    
    document.getElementById('edit-tour-id').value = t.id;
    document.getElementById('edit-tour-name').value = t.name;
    document.getElementById('edit-tour-start').value = t.startDate;
    document.getElementById('edit-tour-end').value = t.endDate;
    document.getElementById('edit-tour-status').value = t.status;
    
    document.getElementById('edit-modal').classList.remove('hidden');
}

document.getElementById('edit-tournament-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-tour-id').value;
    const data = {
        name: document.getElementById('edit-tour-name').value,
        startDate: document.getElementById('edit-tour-start').value,
        endDate: document.getElementById('edit-tour-end').value,
        status: document.getElementById('edit-tour-status').value
    };
    
    try {
        const res = await fetch(`${BASE}/api/tournaments.php?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            closeModal();
            loadTournaments();
        } else {
            alert('Failed to save changes');
        }
    } catch(err) {
        console.error(err);
    }
});

async function deleteTournament(id) {
    if (!confirm('Are you sure you want to delete this tournament? All tournament-team mappings will be cleared.')) return;
    try {
        const res = await fetch(`${BASE}/api/tournaments.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadTournaments();
        } else {
            alert('Failed to delete tournament');
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

loadTournaments();
</script>
<?php pageFooter(); ?>
