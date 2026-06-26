<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'TOSS');

$db = getDB();
$matchId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);

if (!$matchId) {
    jsonResponse(['error' => 'eventId or id parameter is required'], 400);
}

$stmt = $db->prepare("
    SELECT m.*, 
           tw.name AS toss_winner_name
    FROM matches m
    LEFT JOIN teams tw ON m.toss_winner_id = tw.id
    WHERE m.id = ?
");
$stmt->execute([$matchId]);
$match = $stmt->fetch();

if (!$match) {
    jsonResponse(['error' => 'Match not found'], 404);
}

jsonResponse([
    'eventId'      => (int)$match['id'],
    'tossWinner'   => $match['toss_winner_name'] ?? '',
    'tossDecision' => $match['toss_decision'] ?? '',
    'status'       => $match['status'] ?? 'SCHEDULED'
]);
