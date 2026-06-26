<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'SESSION_RESULT');

$eventId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : null;

if (!$eventId) {
    jsonResponse(['error' => 'eventId parameter is required'], 400);
}

// Return empty list of declared sessions as there are no declared sessions in default state
jsonResponse([]);
