<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
$db = getDB();

// Get all teams in a tournament with their match stats
$tournamentId = $_GET['tournamentId'] ?? null;

// Build points table from matches
$query = "
    SELECT t.id, t.name, t.short_name, t.logo_path,
           COUNT(CASE WHEN (m.status='COMPLETED') THEN 1 END) AS played,
           COUNT(CASE WHEN (m.status='COMPLETED' AND m.winner_id=t.id) THEN 1 END) AS won,
           COUNT(CASE WHEN (m.status='COMPLETED' AND m.winner_id IS NOT NULL AND m.winner_id != t.id AND (m.team_a_id=t.id OR m.team_b_id=t.id)) THEN 1 END) AS lost,
           COUNT(CASE WHEN (m.status='COMPLETED' AND m.winner_id IS NULL AND (m.team_a_id=t.id OR m.team_b_id=t.id)) THEN 1 END) AS tied
    FROM teams t
    LEFT JOIN matches m ON (m.team_a_id=t.id OR m.team_b_id=t.id)
    WHERE t.id IN (SELECT team_id FROM tournament_teams)
    GROUP BY t.id, t.name, t.short_name, t.logo_path
    ORDER BY won DESC, played ASC
";
$rows = $db->query($query)->fetchAll();

$table = array_map(fn($r) => [
    'teamId'    => (int)$r['id'],
    'teamName'  => $r['name'],
    'shortName' => $r['short_name'],
    'logoUrl'   => $r['logo_path'] ? UPLOAD_URL.'teams/'.$r['logo_path'] : null,
    'played'    => (int)$r['played'],
    'won'       => (int)$r['won'],
    'lost'      => (int)$r['lost'],
    'tied'      => (int)$r['tied'],
    'points'    => (int)$r['won'] * 2 + (int)$r['tied'],
    'nrr'       => 0.0,
], $rows);

jsonResponse($table);
