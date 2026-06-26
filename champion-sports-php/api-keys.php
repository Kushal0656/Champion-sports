<?php
require_once __DIR__ . '/includes/auth.php';
requireAdmin(); // Admin only
require_once __DIR__ . '/includes/header.php';
pageHeader('Developer Access & API Keys');
require_once __DIR__ . '/includes/sidebar.php';
?>
<div class="main-content">
    <div style="margin-bottom:2rem;border-bottom:1px solid var(--border-light);padding-bottom:1.25rem;">
        <h1 style="margin:0;font-size:1.75rem;">🔑 Developer Access & API Keys</h1>
        <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">
            Generate client credentials, toggle endpoint-level permissions, and retrieve copyable feed integrations.
        </p>
    </div>

    <div class="grid-2" style="gap:2rem;margin-bottom:2.5rem;align-items:start;">
        <!-- Create Key Card -->
        <div class="premium-card" style="padding:1.75rem;">
            <h2 style="font-size:1.2rem;margin-bottom:1rem;display:flex;align-items:center;gap:.5rem;">
                ✨ Generate New Credentials
            </h2>
            <form id="create-key-form" style="display:flex;flex-direction:column;gap:1rem;">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label" style="font-size:.8rem;">Client Name / Application</label>
                    <input type="text" id="new-key-name" class="form-input" placeholder="e.g. OBS Scoreboard Overlay, Ticker" required>
                    <small style="display:block;margin-top:.4rem;color:var(--text-muted);font-size:.75rem;">
                        Provide a recognizable name to track usage of these credentials.
                    </small>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;padding:.6rem;">Generate Keypair</button>
            </form>
        </div>

        <!-- Guidelines Card -->
        <div class="premium-card" style="padding:1.75rem;">
            <h2 style="font-size:1.2rem;margin-bottom:.75rem;">💡 Integration Guide</h2>
            <p style="font-size:.85rem;color:var(--text-secondary);line-height:1.5;margin:0;">
                Use the generated **Client ID** and **Token** parameters to authenticate requests. Authentications can be made by either:
            </p>
            <ul style="font-size:.82rem;color:var(--text-secondary);margin:.5rem 0 0 0;padding-left:1.25rem;line-height:1.6;">
                <li>Passing query parameters: `?clientId=client_xxx&token=tok_yyy`</li>
                <li>Setting HTTP headers: `X-Client-Id` and `X-Token` (or `X-API-Key`)</li>
            </ul>
            <p style="font-size:.82rem;color:var(--text-muted);margin-top:.75rem;line-height:1.4;">
                ⚠️ Clients can only query the specific APIs checked under their permissions row in the table below.
            </p>
        </div>
    </div>

    <!-- Keys Table -->
    <div class="premium-card" style="padding:1.75rem;margin-bottom:2.5rem;">
        <h2 style="font-size:1.2rem;margin-bottom:1.25rem;">📋 Active Credentials</h2>
        <div class="table-container" style="margin:0;overflow-x:auto;">
            <table class="premium-table" style="font-size:.9rem;">
                <thead>
                    <tr>
                        <th>Client Details</th>
                        <th>Credentials</th>
                        <th>API Feed Permissions</th>
                        <th style="width:120px;text-align:center;">Status</th>
                        <th style="width:120px;text-align:center;">Action</th>
                    </tr>
                </thead>
                <tbody id="keys-tbody">
                    <tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading developer keys...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
const ALL_APIS = [
  { value: "EVENTS", label: "Matches (EVENTS)", path: "/api/v1/get/events/1" },
  { value: "SERIES", label: "Series (SERIES)", path: "/api/v1/get/series/1" },
  { value: "BOOKMAKER", label: "Bookmaker Odds (BOOKMAKER)", path: "/api/v1/get/bookmaker/1" },
  { value: "ODDS", label: "Match Odds (ODDS)", path: "/api/v1/get/odds/1" },
  { value: "SESSIONS", label: "Sessions (SESSIONS)", path: "/api/v1/get/sessions/1" },
  { value: "SESSION_RESULT", label: "Session Results (SESSION_RESULT)", path: "/api/v1/result/session_result.php?eventId=1" },
  { value: "TV", label: "Live TV (TV)", path: "/tv.php?eventId=1" },
  { value: "SCORE", label: "Scorecard (SCORE)", path: "/score.php?eventId=1" },
  { value: "TOSS", label: "Toss Market (TOSS)", path: "/api/v1/get/toss/1" },
  { value: "TIED", label: "Tied Market (TIED)", path: "/api/v1/get/tied/1" }
];

let allKeys = [];

async function loadKeys() {
    try {
        const tbody = document.getElementById('keys-tbody');
        const res = await fetch(`${BASE}/api/developer-keys.php`);
        allKeys = await res.json();
        
        if (allKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">No developer keypairs generated yet.</td></tr>';
            return;
        }

        tbody.innerHTML = allKeys.map(k => {
            const allowed = k.allowedApisList || [];
            
            // Build permissions checkbox HTML
            const permissionsHtml = ALL_APIS.map(api => {
                const checked = allowed.includes(api.value) ? 'checked' : '';
                return `
                    <label style="display:inline-flex;align-items:center;gap:.3rem;margin-right:.8rem;margin-bottom:.4rem;font-size:.78rem;cursor:pointer;white-space:nowrap;user-select:none;">
                        <input type="checkbox" style="width:14px;height:14px;accent-color:var(--primary);" ${checked} 
                               onchange="togglePermission(${k.id}, '${api.value}', this.checked)">
                        ${api.value}
                    </label>
                `;
            }).join('');

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(k.name)}</strong>
                        <div style="font-size:.75rem;color:var(--text-muted);margin-top:.2rem;">Created: ${new Date(k.createdAt).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td>
                        <div style="font-size:.8rem;font-family:monospace;background:#f8fafc;padding:.4rem;border-radius:6px;border:1px solid var(--border-light);line-height:1.4;">
                            ID: <span style="color:var(--primary);font-weight:700;">${k.clientId}</span><br>
                            Token: <span style="color:var(--success);font-weight:700;">${k.token}</span>
                        </div>
                        <div style="margin-top:.4rem;display:flex;gap:.4rem;">
                            <button class="btn btn-secondary btn-sm" style="padding:.2rem .4rem;font-size:.7rem;" onclick="copyEndpoints(${k.id})">📋 Copy Feed URLs</button>
                        </div>
                    </td>
                    <td style="max-width:350px;">
                        <div style="display:flex;flex-wrap:wrap;margin-bottom:.4rem;">
                            ${permissionsHtml}
                        </div>
                        <div style="display:flex;gap:.4rem;">
                            <button class="btn btn-secondary btn-sm" style="padding:.1rem .3rem;font-size:.65rem;" onclick="setAllPermissions(${k.id}, true)">Select All</button>
                            <button class="btn btn-secondary btn-sm" style="padding:.1rem .3rem;font-size:.65rem;" onclick="setAllPermissions(${k.id}, false)">Clear All</button>
                        </div>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn ${k.active ? 'btn-success' : 'btn-secondary'} btn-sm" style="width:80px;" onclick="toggleKeyState(${k.id})">
                            ${k.active ? 'Active' : 'Disabled'}
                        </button>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn btn-danger btn-sm" onclick="deleteKey(${k.id})">Revoke</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(err) {
        console.error(err);
        document.getElementById('keys-tbody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--danger);">Failed to load keys.</td></tr>';
    }
}

document.getElementById('create-key-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('new-key-name').value;
    try {
        const res = await fetch(`${BASE}/api/developer-keys.php?name=${encodeURIComponent(name)}`, {
            method: 'POST'
        });
        if (res.ok) {
            document.getElementById('new-key-name').value = '';
            loadKeys();
        } else {
            alert('Failed to generate key');
        }
    } catch(err) {
        console.error(err);
    }
});

async function toggleKeyState(id) {
    try {
        const res = await fetch(`${BASE}/api/developer-keys.php?action=toggle&id=${id}`, {
            method: 'PUT'
        });
        if (res.ok) {
            loadKeys();
        }
    } catch(err) {
        console.error(err);
    }
}

async function togglePermission(id, permission, checked) {
    const key = allKeys.find(x => x.id === id);
    if (!key) return;
    
    let list = key.allowedApis ? key.allowedApis.split(',') : [];
    if (checked) {
        if (!list.includes(permission)) list.push(permission);
    } else {
        list = list.filter(p => p !== permission);
    }
    
    await savePermissions(id, list);
}

async function setAllPermissions(id, selectAll) {
    const list = selectAll ? ALL_APIS.map(a => a.value) : [];
    await savePermissions(id, list);
}

async function savePermissions(id, permissionsArray) {
    try {
        const res = await fetch(`${BASE}/api/developer-keys.php?id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(permissionsArray)
        });
        if (res.ok) {
            loadKeys();
        } else {
            alert('Failed to save permissions');
        }
    } catch(err) {
        console.error(err);
    }
}

async function deleteKey(id) {
    if (!confirm('Are you sure you want to revoke this key? All integrations using these credentials will fail instantly.')) return;
    try {
        const res = await fetch(`${BASE}/api/developer-keys.php?id=${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            loadKeys();
        } else {
            alert('Failed to delete key');
        }
    } catch(err) {
        console.error(err);
    }
}

function copyEndpoints(id) {
    const k = allKeys.find(x => x.id === id);
    if (!k) return;
    
    const allowed = k.allowedApisList || [];
    const text = ALL_APIS.filter(api => allowed.includes(api.value)).map(api => {
        const connector = api.path.includes('?') ? '&' : '?';
        return `${api.label}:\n${BASE}${api.path}${connector}clientId=${k.clientId}&token=${k.token}`;
    }).join('\n\n');
    
    if (!text) {
        alert('No active permissions selected for this key! Select permissions first.');
        return;
    }

    navigator.clipboard.writeText(text).then(() => {
        alert('Credential URLs copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy', err);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

loadKeys();
</script>
<?php pageFooter(); ?>
