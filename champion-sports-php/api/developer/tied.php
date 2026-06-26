<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'TIED');

$db = getDB();
$matchId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);

if (!$matchId) {
    jsonResponse(['error' => 'eventId or id parameter is required'], 400);
}

$stmt = $db->prepare("
    SELECT m.*, 
           ta.name AS team_a_name,
           tb.name AS team_b_name
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
    WHERE m.id = ?
");
$stmt->execute([$matchId]);
$match = $stmt->fetch();

if (!$match) {
    jsonResponse(['error' => 'Match not found'], 404);
}

$openDate = $match['match_date'] ?? '';

jsonResponse([
    [
        'mid'      => (string)$match['id'],
        'openDate' => $openDate,
        'sid'      => '1',
        'nat'      => $match['team_a_name'] ?? 'Team A',
        'b1'       => 98,
        'bs1'      => 0,
        'l1'       => 0,
        'ls1'      => 0,
        's'        => 'ACTIVE',
        'sr'       => '1'
    ],
    [
        'mid'      => (string)$match['id'],
        'openDate' => $openDate,
        'sid'      => '2',
        'nat'      => $match['team_b_name'] ?? 'Team B',
        'b1'       => 98,
        'bs1'      => 0,
        'l1'       => 0,
        'ls1'      => 0,
        's'        => 'ACTIVE',
        'sr'       => '2'
    ]
]);
