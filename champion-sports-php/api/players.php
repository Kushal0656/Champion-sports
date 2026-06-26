<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $db->prepare("SELECT t.*,tm.name AS team_name FROM players t LEFT JOIN teams tm ON t.team_id=tm.id WHERE t.id=?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(['error'=>'Not found'], 404);
            // Special: photo endpoint
            if (isset($_GET['photo']) && $row['photo_path'] && file_exists(UPLOAD_DIR.'players/'.$row['photo_path'])) {
                $file = UPLOAD_DIR.'players/'.$row['photo_path'];
                header('Content-Type: image/jpeg');
                readfile($file); exit;
            }
            jsonResponse(formatPlayer($row));
        } else {
            $teamId = $_GET['teamId'] ?? null;
            if ($teamId) {
                $stmt = $db->prepare("SELECT p.*,t.name AS team_name FROM players p LEFT JOIN teams t ON p.team_id=t.id WHERE p.team_id=? ORDER BY p.id");
                $stmt->execute([$teamId]);
            } else {
                $stmt = $db->query("SELECT p.*,t.name AS team_name FROM players p LEFT JOIN teams t ON p.team_id=t.id ORDER BY p.id");
            }
            jsonResponse(array_map('formatPlayer', $stmt->fetchAll()));
        }
        break;

    case 'POST':
        $action = $_GET['action'] ?? null;
        if ($action === 'photo') {
            if (!$id) jsonResponse(['error'=>'ID required'],400);
            $photoPath = null;
            $fileKey = isset($_FILES['file']) ? 'file' : 'photo';
            if (!empty($_FILES[$fileKey]['tmp_name'])) {
                $oldStmt = $db->prepare("SELECT photo_path FROM players WHERE id=?");
                $oldStmt->execute([$id]);
                $old = $oldStmt->fetch();
                if ($old && $old['photo_path'] && file_exists(UPLOAD_DIR.'players/'.$old['photo_path'])) {
                    unlink(UPLOAD_DIR.'players/'.$old['photo_path']);
                }
                
                $ext = pathinfo($_FILES[$fileKey]['name'], PATHINFO_EXTENSION);
                $photoPath = uniqid().'.'.$ext;
                if (!file_exists(UPLOAD_DIR.'players/')) {
                    mkdir(UPLOAD_DIR.'players/', 0777, true);
                }
                move_uploaded_file($_FILES[$fileKey]['tmp_name'], UPLOAD_DIR.'players/'.$photoPath);
                
                $stmt = $db->prepare("UPDATE players SET photo_path=? WHERE id=?");
                $stmt->execute([$photoPath,$id]);
            }
            $stmt2 = $db->prepare("SELECT p.*,t.name AS team_name FROM players p LEFT JOIN teams t ON p.team_id=t.id WHERE p.id=?");
            $stmt2->execute([$id]);
            jsonResponse(formatPlayer($stmt2->fetch()));
        } else {
            $name = $_POST['name'] ?? getInput()['name'] ?? '';
            $role = $_POST['role'] ?? getInput()['role'] ?? '';
            $teamId = $_POST['teamId'] ?? getInput()['teamId'] ?? null;
            $jersey = $_POST['jerseyNumber'] ?? getInput()['jerseyNumber'] ?? null;
            $photoPath = null;
            if (!empty($_FILES['photo']['tmp_name'])) {
                $ext = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
                $photoPath = uniqid().'.'.$ext;
                if (!file_exists(UPLOAD_DIR.'players/')) {
                    mkdir(UPLOAD_DIR.'players/', 0777, true);
                }
                move_uploaded_file($_FILES['photo']['tmp_name'], UPLOAD_DIR.'players/'.$photoPath);
            }
            $stmt = $db->prepare("INSERT INTO players (name,role,team_id,photo_path,jersey_number) VALUES (?,?,?,?,?)");
            $stmt->execute([$name,$role,$teamId?:(null),$photoPath,$jersey]);
            $newId = $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT p.*,t.name AS team_name FROM players p LEFT JOIN teams t ON p.team_id=t.id WHERE p.id=?");
            $stmt2->execute([$newId]);
            jsonResponse(formatPlayer($stmt2->fetch()));
        }
        break;
 
    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $action = $_GET['action'] ?? null;
        if ($action === 'assign-team') {
            $teamId = $_GET['teamId'] ?? getInput()['teamId'] ?? null;
            if (!$teamId) jsonResponse(['error'=>'teamId required'],400);
            $stmt = $db->prepare("UPDATE players SET team_id=? WHERE id=?");
            $stmt->execute([$teamId, $id]);
        } elseif ($action === 'remove-team') {
            $stmt = $db->prepare("UPDATE players SET team_id=NULL WHERE id=?");
            $stmt->execute([$id]);
        } else {
            $d = getInput();
            $stmt = $db->prepare("UPDATE players SET name=?,role=?,team_id=?,jersey_number=? WHERE id=?");
            $stmt->execute([$d['name']??'',$d['role']??'',$d['teamId']??null,$d['jerseyNumber']??null,$id]);
        }
        $stmt2 = $db->prepare("SELECT p.*,t.name AS team_name FROM players p LEFT JOIN teams t ON p.team_id=t.id WHERE p.id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatPlayer($stmt2->fetch()));
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $db->prepare("DELETE FROM players WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;
}

function formatPlayer(array $row): array {
    return [
        'id'           => (int)$row['id'],
        'name'         => $row['name'],
        'role'         => $row['role'],
        'jerseyNumber' => $row['jersey_number'] ? (int)$row['jersey_number'] : null,
        'photoUrl'     => $row['photo_path'] ? UPLOAD_URL.'players/'.$row['photo_path'] : null,
        'team'         => $row['team_id'] ? ['id'=>(int)$row['team_id'],'name'=>$row['team_name']] : null,
    ];
}
