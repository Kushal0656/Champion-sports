<?php
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = getDB();

try {
    $totalTeams = $db->query("SELECT COUNT(*) FROM teams")->fetchColumn();
    $totalPlayers = $db->query("SELECT COUNT(*) FROM players")->fetchColumn();
    $totalMatches = $db->query("SELECT COUNT(*) FROM matches")->fetchColumn();
    $totalTournaments = $db->query("SELECT COUNT(*) FROM tournaments")->fetchColumn();

    jsonResponse([
        'totalTeams' => (int) $totalTeams,
        'totalPlayers' => (int) $totalPlayers,
        'totalMatches' => (int) $totalMatches,
        'totalTournaments' => (int) $totalTournaments
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    jsonResponse(['error' => 'Failed to fetch dashboard stats: ' . $e->getMessage()]);
}
