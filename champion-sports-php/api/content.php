<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$key = $_GET['key'] ?? null;

if ($method === 'GET') {
    if ($key) {
        $stmt = $db->prepare("SELECT * FROM content WHERE content_key=?");
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        jsonResponse($row ? ['key'=>$row['content_key'],'value'=>$row['value']] : ['key'=>$key,'value'=>null]);
    } else {
        $rows = $db->query("SELECT * FROM content ORDER BY content_key")->fetchAll();
        jsonResponse(array_map(fn($r) => ['key'=>$r['content_key'],'value'=>$r['value']], $rows));
    }
} elseif ($method === 'POST' || $method === 'PUT') {
    $d = getInput();
    $k = $d['key'] ?? $key;
    $v = $d['value'] ?? $_GET['value'] ?? $_POST['value'] ?? '';
    $stmt = $db->prepare("INSERT INTO content (content_key,value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?");
    $stmt->execute([$k,$v,$v]);
    jsonResponse(['key'=>$k,'value'=>$v]);
}
