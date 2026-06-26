<?php
require_once __DIR__ . '/includes/auth.php';
requireAdmin(); // Admin only
require_once __DIR__ . '/includes/header.php';
pageHeader('Stream Overlay Studio');
require_once __DIR__ . '/includes/sidebar.php';
?>
<div class="main-content">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
        <div>
            <h1 style="margin:0;font-size:1.75rem;">🎦 Stream Overlay Studio</h1>
            <p style="color:var(--text-secondary);margin:.25rem 0 0;font-size:.9rem;">Manage graphic slide overlays and configure screen layout positions for OBS.</p>
        </div>
        <div style="display:flex;gap:.5rem;">
            <a href="<?= SITE_URL ?>/overlay-view.php" target="_blank" class="btn btn-secondary">🌐 Launch OBS View</a>
            <button class="btn btn-secondary" onclick="loadSlides()">🔄 Refresh List</button>
        </div>
    </div>

    <!-- Create Slide Card -->
    <div class="premium-card" style="margin-bottom:2.5rem;">
        <h2 style="font-size:1.25rem;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;">✨ Upload New Slide</h2>
        <form id="create-slide-form" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;align-items:end;" enctype="multipart/form-data">
            <div class="form-group">
                <label class="form-label">Slide Title</label>
                <input type="text" name="title" class="form-input" placeholder="e.g. Main Match Ticker" required>
            </div>
            <div class="form-group">
                <label class="form-label">OBS Resolution Width (px)</label>
                <input type="number" name="width" class="form-input" value="1920" required>
            </div>
            <div class="form-group">
                <label class="form-label">OBS Resolution Height (px)</label>
                <input type="number" name="height" class="form-input" value="1080" required>
            </div>
            <div class="form-group">
                <label class="form-label">Background Image</label>
                <input type="file" name="image" class="form-input" accept="image/*" required>
            </div>
            <button type="submit" class="btn btn-primary" style="height:42px;">➕ Upload Slide</button>
        </form>
    </div>

    <!-- Active Status Banner -->
    <div id="active-banner" class="premium-card" style="background:#0f172a;color:#fff;padding:1.25rem;margin-bottom:2rem;display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
            <div>
                <span class="live-badge" style="background:#10b981;margin-bottom:.25rem;"><span class="live-dot"></span>ACTIVE OVERLAY</span>
                <h3 id="active-slide-title" style="color:#fff;margin:0;font-size:1.25rem;">—</h3>
                <p id="active-slide-info" style="color:#94a3b8;font-size:.85rem;margin:.25rem 0 0;">—</p>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deactivateAll()">Deactivate Graphic</button>
        </div>
    </div>

    <!-- Slides List -->
    <h2 style="font-size:1.2rem;margin-bottom:1rem;">📋 Available Graphics Templates</h2>
    <div class="grid-2" id="slides-grid">
        <div style="grid-column:span 2;text-align:center;padding:3rem;color:var(--text-muted);">Loading slides...</div>
    </div>
</div>

<!-- Customize Layout Modal -->
<div id="layout-modal" class="modal-backdrop hidden" onclick="closeModal(event)">
    <div class="modal" style="max-width:800px;width:95%;" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h2 id="layout-modal-title" style="margin:0;font-size:1.3rem;">Configure Overlay Layout</h2>
            <button class="btn btn-secondary btn-sm" onclick="closeModal(event)" style="padding:.25rem .5rem;">✕</button>
        </div>
        <form id="layout-form" style="display:flex;flex-direction:column;gap:1.5rem;">
            <input type="hidden" id="layout-slide-id">
            
            <p style="font-size:.85rem;color:var(--text-muted);margin:0;">
                Define positions (relative percentages 0-100) and dimensions of elements displayed on the screen.
            </p>
            
            <div id="layout-elements-container" style="display:flex;flex-direction:column;gap:1rem;max-height:400px;overflow-y:auto;padding-right:.5rem;">
                <!-- Element rows go here -->
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="addLayoutElementRow()">➕ Add Element</button>
                <button type="submit" class="btn btn-primary">💾 Save Layout</button>
            </div>
        </form>
    </div>
</div>

<script>
const BASE = '<?= SITE_URL ?>';
let allSlides = [];

async function loadSlides() {
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php`);
        allSlides = await res.json();
        
        const active = allSlides.find(s => s.active);
        const banner = document.getElementById('active-banner');
        if (active) {
            document.getElementById('active-slide-title').textContent = active.title;
            document.getElementById('active-slide-info').textContent = `Resolution: ${active.width}x${active.height}px | Background URL: ${active.imageUrl || 'None'}`;
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }

        const grid = document.getElementById('slides-grid');
        if (allSlides.length === 0) {
            grid.innerHTML = '<div style="grid-column:span 2;text-align:center;padding:3rem;color:var(--text-muted);">No slides uploaded yet.</div>';
            return;
        }

        grid.innerHTML = allSlides.map(s => `
            <div class="premium-card" style="padding:1.5rem;display:flex;flex-direction:column;border:${s.active ? '2px solid var(--success)' : '1px solid var(--border-light)'};">
                <div style="position:relative;width:100%;height:180px;border-radius:10px;background:#f1f5f9;margin-bottom:1rem;overflow:hidden;border:1px solid var(--border-light);display:flex;align-items:center;justify-content:center;">
                    ${s.imageUrl ? `<img src="${s.imageUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<span style="font-size:3rem;">🖼️</span>'}
                    ${s.active ? '<span class="badge badge-success" style="position:absolute;top:10px;left:10px;box-shadow:0 2px 8px rgba(16,185,129,0.3);">Active</span>' : ''}
                </div>
                <h3 style="margin:0 0 .25rem;font-size:1.15rem;">${escapeHtml(s.title)}</h3>
                <p style="font-size:.8rem;color:var(--text-muted);margin-bottom:1.25rem;font-weight:600;">Dimensions: ${s.width} x ${s.height} px</p>
                
                <div style="display:flex;gap:.5rem;margin-top:auto;flex-wrap:wrap;">
                    ${s.active ? 
                        `<button class="btn btn-secondary btn-sm" style="flex:1;" disabled>🟢 Active</button>` : 
                        `<button class="btn btn-success btn-sm" style="flex:1;" onclick="activateSlide(${s.id}, ${s.width}, ${s.height})">⚡ Activate</button>`
                    }
                    <button class="btn btn-secondary btn-sm" onclick="openLayoutModal(${s.id})">📐 Layout</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSlide(${s.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    } catch(err) {
        console.error(err);
        document.getElementById('slides-grid').innerHTML = '<div style="grid-column:span 2;text-align:center;padding:3rem;color:var(--danger);">Failed to load slides.</div>';
    }
}

document.getElementById('create-slide-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            e.target.reset();
            loadSlides();
        } else {
            alert('Failed to upload slide');
        }
    } catch(err) {
        console.error(err);
    }
});

async function activateSlide(id, w, h) {
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?action=activate&id=${id}&w=${w}&h=${h}`, {
            method: 'PUT'
        });
        if (res.ok) {
            loadSlides();
        } else {
            alert('Failed to activate slide');
        }
    } catch(err) {
        console.error(err);
    }
}

async function deactivateAll() {
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?action=deactivate-all`, {
            method: 'PUT'
        });
        if (res.ok) {
            loadSlides();
        } else {
            alert('Failed to deactivate overlay');
        }
    } catch(err) {
        console.error(err);
    }
}

async function deleteSlide(id) {
    if (!confirm('Are you sure you want to delete this slide? Background image and layout configurations will be permanently cleared.')) return;
    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadSlides();
        } else {
            alert('Failed to delete slide');
        }
    } catch(err) {
        console.error(err);
    }
}

function openLayoutModal(id) {
    const s = allSlides.find(x => x.id === id);
    if (!s) return;

    document.getElementById('layout-slide-id').value = s.id;
    document.getElementById('layout-modal-title').textContent = `Configure Layout: ${s.title}`;
    
    let layout = [];
    try {
        layout = JSON.parse(s.overlayLayout || '[]');
    } catch(e){}

    const container = document.getElementById('layout-elements-container');
    container.innerHTML = '';
    
    if (layout.length === 0) {
        // Add default scoreboard row
        layout.push({ id: 'scoreboard_default', type: 'scoreboard', name: 'Live Scoreboard', x: 50, y: 85, width: 850, height: 60, visible: true });
    }

    layout.forEach(el => renderElementRow(el));
    document.getElementById('layout-modal').classList.remove('hidden');
}

function renderElementRow(el) {
    const container = document.getElementById('layout-elements-container');
    const div = document.createElement('div');
    div.className = 'layout-row';
    div.style.display = 'grid';
    div.style.gridTemplateColumns = '1.2fr 1fr 1fr 1fr 1fr 1fr auto';
    div.style.gap = '.5rem';
    div.style.alignItems = 'center';
    div.style.background = '#f8fafc';
    div.style.padding = '.75rem';
    div.style.borderRadius = '8px';
    div.style.border = '1px solid var(--border-light)';
    div.style.marginBottom = '.5rem';

    div.innerHTML = `
        <div class="form-group" style="margin:0;">
            <label style="font-size:.7rem;font-weight:700;color:var(--text-muted);">Element Type</label>
            <select class="form-select el-type" style="padding:.4rem;font-size:.85rem;" onchange="onElementTypeChange(this)">
                <option value="scoreboard" ${el.type==='scoreboard'?'selected':''}>Scoreboard</option>
                <option value="text" ${el.type==='text'?'selected':''}>Custom Text</option>
            </select>
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:.7rem;font-weight:700;color:var(--text-muted);">X (%)</label>
            <input type="number" class="form-input el-x" style="padding:.4rem;font-size:.85rem;" value="${el.x ?? 0}" min="0" max="100">
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:.7rem;font-weight:700;color:var(--text-muted);">Y (%)</label>
            <input type="number" class="form-input el-y" style="padding:.4rem;font-size:.85rem;" value="${el.y ?? 0}" min="0" max="100">
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:.7rem;font-weight:700;color:var(--text-muted);">Width (px)</label>
            <input type="number" class="form-input el-w" style="padding:.4rem;font-size:.85rem;" value="${el.width ?? 100}">
        </div>
        <div class="form-group" style="margin:0;">
            <label style="font-size:.7rem;font-weight:700;color:var(--text-muted);">Height (px)</label>
            <input type="number" class="form-input el-h" style="padding:.4rem;font-size:.85rem;" value="${el.height ?? 50}">
        </div>
        <div class="form-group" style="margin:0;display:flex;flex-direction:row;align-items:center;gap:.3rem;">
            <input type="checkbox" class="el-vis" style="width:16px;height:16px;" ${el.visible?'checked':''}>
            <label style="font-size:.75rem;font-weight:700;color:var(--text-secondary);">Visible</label>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" style="padding:.4rem .6rem;">✕</button>
        <div class="text-val-container" style="grid-column: span 6; margin-top:.4rem; display:${el.type==='text'?'block':'none'};">
            <input type="text" class="form-input el-text-val" placeholder="Custom text content..." value="${el.text ?? ''}">
        </div>
    `;
    container.appendChild(div);
}

function onElementTypeChange(select) {
    const row = select.closest('.layout-row');
    const valContainer = row.querySelector('.text-val-container');
    valContainer.style.display = select.value === 'text' ? 'block' : 'none';
}

function addLayoutElementRow() {
    renderElementRow({ type: 'text', x: 10, y: 10, width: 300, height: 40, visible: true });
}

document.getElementById('layout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('layout-slide-id').value;
    const container = document.getElementById('layout-elements-container');
    const rows = container.querySelectorAll('.layout-row');
    const layout = [];

    rows.forEach((row, i) => {
        const type = row.querySelector('.el-type').value;
        const x = Number(row.querySelector('.el-x').value);
        const y = Number(row.querySelector('.el-y').value);
        const width = Number(row.querySelector('.el-w').value);
        const height = Number(row.querySelector('.el-h').value);
        const visible = row.querySelector('.el-vis').checked;
        const text = type === 'text' ? row.querySelector('.el-text-val').value : '';

        layout.push({
            id: `${type}_${i}_` + Date.now(),
            type: type,
            x: x,
            y: y,
            width: width,
            height: height,
            visible: visible,
            text: text
        });
    });

    try {
        const res = await fetch(`${BASE}/api/overlay-slides.php?action=layout&id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
        });
        if (res.ok) {
            closeModal();
            loadSlides();
            alert('Layout configured successfully!');
        } else {
            alert('Failed to save layout configuration');
        }
    } catch(err) {
        console.error(err);
    }
});

function closeModal(e) {
    document.getElementById('layout-modal').classList.add('hidden');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

loadSlides();
</script>
<?php pageFooter(); ?>
