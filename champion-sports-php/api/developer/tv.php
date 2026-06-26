<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'TV');

$db = getDB();
$eventId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : null;
$marketId = $_GET['marketId'] ?? '1.10098734';

if (!$eventId) {
    jsonResponse(['error' => 'eventId parameter is required'], 400);
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
$stmt->execute([$eventId]);
$match = $stmt->fetch();

if (!$match) {
    jsonResponse(['error' => 'Match not found'], 404);
}

jsonResponse([
    'eventId'   => (int)$match['id'],
    'marketId'  => $marketId,
    'streamUrl' => $match['stream_url'] ?? '',
    'status'    => $match['status'] ?? 'SCHEDULED',
    'title'     => ($match['team_a_name'] && $match['team_b_name']) ? "{$match['team_a_name']} vs {$match['team_b_name']}" : "Match Broadcast"
]);
