<?php
// Sidebar HTML component - include in every page
$current = basename($_SERVER['PHP_SELF']);
$loggedIn = isAdminLoggedIn();

$guestLinks = [
    ['href' => 'index.php',        'icon' => '📊', 'label' => 'Dashboard'],
    ['href' => 'teams.php',        'icon' => '👥', 'label' => 'Teams'],
    ['href' => 'matches.php',      'icon' => '🏏', 'label' => 'Matches'],
    ['href' => 'scorecard.php',    'icon' => '📋', 'label' => 'Scorecard'],
    ['href' => 'points-table.php', 'icon' => '📊', 'label' => 'Points Table'],
    ['href' => 'login.php',        'icon' => '🔑', 'label' => 'Admin Login'],
];

$adminLinks = [
    ['href' => 'index.php',           'icon' => '📊', 'label' => 'Dashboard'],
    ['href' => 'teams.php',           'icon' => '👥', 'label' => 'Teams'],
    ['href' => 'players.php',         'icon' => '👤', 'label' => 'Players'],
    ['href' => 'tournament.php',      'icon' => '🏆', 'label' => 'Tournaments'],
    ['href' => 'tournament-teams.php','icon' => '🤝', 'label' => 'Tournament Teams'],
    ['href' => 'matches.php',         'icon' => '🏏', 'label' => 'Matches'],
    ['href' => 'live-scoring.php',    'icon' => '⚡', 'label' => 'Live Scoring'],
    ['href' => 'overlay.php',         'icon' => '🎦', 'label' => 'Slides & Overlay'],
    ['href' => 'scorecard.php',       'icon' => '📋', 'label' => 'Scorecard'],
    ['href' => 'points-table.php',    'icon' => '📈', 'label' => 'Points Table'],
    ['href' => 'api-keys.php',        'icon' => '🔑', 'label' => 'API Keys'],
];

$links = $loggedIn ? $adminLinks : $guestLinks;
?>
<div class="sidebar" id="sidebar">
    <div style="margin-bottom:2.5rem;text-align:center;">
        <h2 style="color:#fff;font-size:1.4rem;font-weight:700;margin:0 0 0.25rem 0;">🏏 Champion Sports</h2>
        <span style="font-size:0.78rem;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">
            <?= $loggedIn ? 'Admin Portal' : 'Fan Portal' ?>
        </span>
    </div>
    <nav style="display:flex;flex-direction:column;gap:0.4rem;flex:1;">
        <?php foreach ($links as $link): ?>
        <a href="<?= SITE_URL ?>/<?= $link['href'] ?>"
           class="sidebar-link <?= $current === $link['href'] ? 'active' : '' ?>">
            <span style="font-size:1.1rem;"><?= $link['icon'] ?></span>
            <?= htmlspecialchars($link['label']) ?>
        </a>
        <?php endforeach; ?>
        <?php if ($loggedIn): ?>
        <a href="<?= SITE_URL ?>/logout.php" class="sidebar-link" style="color:#ef4444;margin-top:auto;">
            <span style="font-size:1.1rem;">🚪</span> Logout
        </a>
        <?php endif; ?>
    </nav>
    <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,0.1);padding-top:1.25rem;text-align:center;">
        <p style="font-size:0.78rem;color:#64748b;"><?= $loggedIn ? 'Authorized Administrator' : 'Guest Mode' ?></p>
    </div>
</div>
