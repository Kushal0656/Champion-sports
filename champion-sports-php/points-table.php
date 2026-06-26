<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/header.php';
pageHeader('Points Table');
require_once __DIR__ . '/includes/sidebar.php';
?>
<div class="main-content">
    <div style="margin-bottom:2rem;border-bottom:1px solid var(--border-light);padding-bottom:1.25rem;">
        <h1 style="margin:0;font-size:1.75rem;">📊 Points Table Standings</h1>
        <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">View league standings, match wins, losses, points and team performance.</p>
    </div>

    <!-- Points Standings Table -->
    <div class="premium-card" style="padding:1.75rem;">
        <h2 style="font-size:1.2rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">📈 Standings Table</h2>
        <div class="table-container" style="margin:0;">
            <table class="premium-table">
                <thead>
                    <tr>
                        <th style="width:60px;text-align:center;">Pos</th>
                        <th>Team</th>
                        <th style="text-align:center;">Played</th>
                        <th style="text-align:center;color:var(--success-hover);">Won</th>
                        <th style="text-align:center;color:var(--danger-hover);">Lost</th>
                        <th style="text-align:center;color:var(--warning-hover);">Tied</th>
                        <th style="text-align:center;color:var(--primary);font-weight:800;">Points</th>
                    </tr>
                </thead>
                <tbody id="points-tbody">
                    <tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading standings...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';

async function loadStandings() {
    try {
        const tbody = document.getElementById('points-tbody');
        const res = await fetch(`${BASE}/api/points-table.php`);
        const rows = await res.json();
        
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">No standings data available yet. Map teams to tournaments and play matches first.</td></tr>';
            return;
        }

        // Sort by points desc, won desc
        rows.sort((a, b) => b.points - a.points || b.won - a.won);

        tbody.innerHTML = rows.map((r, i) => `
            <tr>
                <td style="text-align:center;font-weight:800;color:var(--text-muted);">${i + 1}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:.75rem;">
                        <div style="width:32px;height:32px;border-radius:6px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--border-light);flex-shrink:0;">
                            ${r.logoUrl ? `<img src="${r.logoUrl}" style="width:100%;height:100%;object-fit:cover;">` : '👥'}
                        </div>
                        <div>
                            <span style="font-weight:700;">${escapeHtml(r.teamName)}</span>
                            <span class="badge badge-primary" style="font-size:.65rem;margin-left:.25rem;padding:.1rem .3rem;">${escapeHtml(r.shortName)}</span>
                        </div>
                    </div>
                </td>
                <td style="text-align:center;font-weight:600;">${r.played}</td>
                <td style="text-align:center;font-weight:700;color:var(--success);">${r.won}</td>
                <td style="text-align:center;color:var(--danger);">${r.lost}</td>
                <td style="text-align:center;color:var(--warning);">${r.tied}</td>
                <td style="text-align:center;font-weight:800;color:var(--primary);font-size:1.05rem;">${r.points}</td>
            </tr>
        `).join('');
    } catch(err) {
        console.error(err);
        document.getElementById('points-tbody').innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--danger);">Failed to load points table data.</td></tr>';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

loadStandings();
</script>
<?php pageFooter(); ?>
