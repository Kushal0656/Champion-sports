<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'BOOKMAKER');

$db = getDB();
$matchId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);

if (!$matchId) {
    jsonResponse(['error' => 'eventId or id parameter is required'], 400);
}

$stmt = $db->prepare("SELECT * FROM match_odds WHERE match_id = ?");
$stmt->execute([$matchId]);
$odds = $stmt->fetch();

if (!$odds) {
    // Insert default odds
    $db->prepare("INSERT INTO match_odds (match_id, team_a_odds, team_b_odds, draw_odds, bookmaker_odds) VALUES (?, 1.90, 1.90, 4.00, 1.90)")->execute([$matchId]);
    $stmt = $db->prepare("SELECT * FROM match_odds WHERE match_id = ?");
    $stmt->execute([$matchId]);
    $odds = $stmt->fetch();
}

jsonResponse([
    'id'            => (int)$odds['id'],
    'matchId'       => (int)$odds['match_id'],
    'teamAOdds'     => (float)$odds['team_a_odds'],
    'teamBOdds'     => (float)$odds['team_b_odds'],
    'drawOdds'      => (float)$odds['draw_odds'],
    'bookmakerOdds' => (float)$odds['bookmaker_odds'],
    'updatedAt'     => $odds['updated_at']
]);
