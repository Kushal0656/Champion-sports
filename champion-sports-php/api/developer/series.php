<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'SERIES');

$db = getDB();
$rows = $db->query("SELECT * FROM tournaments ORDER BY id DESC")->fetchAll();

$series = array_map(function($row) {
    return [
        'id'        => (int)$row['id'],
        'name'      => $row['name'],
        'startDate' => $row['start_date'],
        'endDate'   => $row['end_date'],
        'status'    => $row['status']
    ];
}, $rows);

jsonResponse($series);
