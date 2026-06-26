<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM teams WHERE id=?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(['error'=>'Not found'],404);
            // Logo endpoint
            if (isset($_GET['logo']) && $row['logo_path'] && file_exists(UPLOAD_DIR.'teams/'.$row['logo_path'])) {
                header('Content-Type: image/png');
                readfile(UPLOAD_DIR.'teams/'.$row['logo_path']); exit;
            }
            jsonResponse(formatTeam($row));
        } else {
            $rows = $db->query("SELECT * FROM teams ORDER BY name")->fetchAll();
            jsonResponse(array_map('formatTeam', $rows));
        }
        break;

    case 'POST':
        $action = $_GET['action'] ?? null;
        if ($action === 'logo') {
            if (!$id) jsonResponse(['error'=>'ID required'],400);
            $logoPath = null;
            $fileKey = isset($_FILES['file']) ? 'file' : 'logo';
            if (!empty($_FILES[$fileKey]['tmp_name'])) {
                $oldStmt = $db->prepare("SELECT logo_path FROM teams WHERE id=?");
                $oldStmt->execute([$id]);
                $old = $oldStmt->fetch();
                if ($old && $old['logo_path'] && file_exists(UPLOAD_DIR.'teams/'.$old['logo_path'])) {
                    unlink(UPLOAD_DIR.'teams/'.$old['logo_path']);
                }
                
                $ext = pathinfo($_FILES[$fileKey]['name'], PATHINFO_EXTENSION);
                $logoPath = uniqid().'.'.$ext;
                if (!file_exists(UPLOAD_DIR.'teams/')) {
                    mkdir(UPLOAD_DIR.'teams/', 0777, true);
                }
                move_uploaded_file($_FILES[$fileKey]['tmp_name'], UPLOAD_DIR.'teams/'.$logoPath);
                
                $stmt = $db->prepare("UPDATE teams SET logo_path=? WHERE id=?");
                $stmt->execute([$logoPath,$id]);
            }
            $stmt2 = $db->prepare("SELECT * FROM teams WHERE id=?");
            $stmt2->execute([$id]);
            jsonResponse(formatTeam($stmt2->fetch()));
        } else {
            $name  = $_POST['name']      ?? getInput()['name']      ?? '';
            $short = $_POST['shortName'] ?? getInput()['shortName'] ?? '';
            $logoPath = null;
            if (!empty($_FILES['logo']['tmp_name'])) {
                $ext = pathinfo($_FILES['logo']['name'], PATHINFO_EXTENSION);
                $logoPath = uniqid().'.'.$ext;
                if (!file_exists(UPLOAD_DIR.'teams/')) {
                    mkdir(UPLOAD_DIR.'teams/', 0777, true);
                }
                move_uploaded_file($_FILES['logo']['tmp_name'], UPLOAD_DIR.'teams/'.$logoPath);
            }
            $stmt = $db->prepare("INSERT INTO teams (name,short_name,logo_path) VALUES (?,?,?)");
            $stmt->execute([$name,$short,$logoPath]);
            $newId = $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT * FROM teams WHERE id=?");
            $stmt2->execute([$newId]);
            jsonResponse(formatTeam($stmt2->fetch()));
        }
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $d = getInput();
        $stmt = $db->prepare("UPDATE teams SET name=?,short_name=? WHERE id=?");
        $stmt->execute([$d['name']??'',$d['shortName']??'',$id]);
        $stmt2 = $db->prepare("SELECT * FROM teams WHERE id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatTeam($stmt2->fetch()));
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $db->prepare("DELETE FROM teams WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;
}

function formatTeam(array $row): array {
    return [
        'id'        => (int)$row['id'],
        'name'      => $row['name'],
        'shortName' => $row['short_name'],
        'logoUrl'   => $row['logo_path'] ? UPLOAD_URL.'teams/'.$row['logo_path'] : null,
    ];
}
