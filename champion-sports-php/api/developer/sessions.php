<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'SESSIONS');

$matchId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : (isset($_GET['id']) ? (int)$_GET['id'] : null);

if (!$matchId) {
    jsonResponse(['error' => 'eventId or id parameter is required'], 400);
}

// Return mock/default sessions similar to Spring Boot
jsonResponse([
    [
        'id'          => 1,
        'matchId'     => $matchId,
        'sessionName' => '6 Over Runs Market',
        'runLine'     => 48,
        'yesOdds'     => 1.85,
        'noOdds'      => 1.85,
        'status'      => 'ACTIVE'
    ],
    [
        'id'          => 2,
        'matchId'     => $matchId,
        'sessionName' => '10 Over Runs Market',
        'runLine'     => 82,
        'yesOdds'     => 1.90,
        'noOdds'      => 1.90,
        'status'      => 'ACTIVE'
    ]
]);
