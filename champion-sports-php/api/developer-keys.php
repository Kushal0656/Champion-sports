<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        $rows = $db->query("SELECT * FROM developer_keys ORDER BY id DESC")->fetchAll();
        jsonResponse(array_map('formatKey', $rows));
        break;

    case 'POST':
        $name = $_GET['name'] ?? getInput()['name'] ?? 'Unnamed';
        $clientId = 'client_' . substr(str_replace('-','',generateUUID()), 0, 12);
        $token    = 'tok_' . str_replace('-','',generateUUID());
        $stmt = $db->prepare("INSERT INTO developer_keys (name,client_id,token) VALUES (?,?,?)");
        $stmt->execute([$name,$clientId,$token]);
        $newId = $db->lastInsertId();
        $stmt2 = $db->prepare("SELECT * FROM developer_keys WHERE id=?");
        $stmt2->execute([$newId]);
        jsonResponse(formatKey($stmt2->fetch()));
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        // Toggle or update permissions
        $action = $_GET['action'] ?? null;
        if ($action === 'toggle') {
            $stmt = $db->prepare("UPDATE developer_keys SET active = NOT active WHERE id=?");
            $stmt->execute([$id]);
        } else {
            // Update permissions: body is array of strings
            $d = getInput();
            $apis = is_array($d) ? implode(',', $d) : '';
            $stmt = $db->prepare("UPDATE developer_keys SET allowed_apis=? WHERE id=?");
            $stmt->execute([$apis,$id]);
        }
        $stmt2 = $db->prepare("SELECT * FROM developer_keys WHERE id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatKey($stmt2->fetch()));
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $db->prepare("DELETE FROM developer_keys WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;
}

function formatKey(array $row): array {
    $apis = $row['allowed_apis'] ?? '';
    return [
        'id'             => (int)$row['id'],
        'name'           => $row['name'],
        'clientId'       => $row['client_id'],
        'token'          => $row['token'],
        'active'         => (bool)$row['active'],
        'allowedApis'    => $apis,
        'allowedApisList'=> $apis ? explode(',', $apis) : [],
        'createdAt'      => $row['created_at'],
    ];
}
