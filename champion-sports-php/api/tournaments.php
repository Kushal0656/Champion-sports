<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM tournaments WHERE id=?");
            $stmt->execute([$id]);
            jsonResponse(formatTournament($stmt->fetch()));
        } else {
            $rows = $db->query("SELECT * FROM tournaments ORDER BY id DESC")->fetchAll();
            jsonResponse(array_map('formatTournament',$rows));
        }
        break;
    case 'POST':
        $d = getInput();
        $stmt = $db->prepare("INSERT INTO tournaments (name,start_date,end_date,status) VALUES (?,?,?,?)");
        $stmt->execute([$d['name']??'',$d['startDate']??null,$d['endDate']??null,$d['status']??'UPCOMING']);
        $newId = $db->lastInsertId();
        $stmt2 = $db->prepare("SELECT * FROM tournaments WHERE id=?");
        $stmt2->execute([$newId]);
        jsonResponse(formatTournament($stmt2->fetch()));
        break;
    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $d = getInput();
        $stmt = $db->prepare("UPDATE tournaments SET name=?,start_date=?,end_date=?,status=? WHERE id=?");
        $stmt->execute([$d['name']??'',$d['startDate']??null,$d['endDate']??null,$d['status']??'UPCOMING',$id]);
        $stmt2 = $db->prepare("SELECT * FROM tournaments WHERE id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatTournament($stmt2->fetch()));
        break;
    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $db->prepare("DELETE FROM tournaments WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;
}

function formatTournament(array $row): array {
    return ['id'=>(int)$row['id'],'name'=>$row['name'],'startDate'=>$row['start_date'],'endDate'=>$row['end_date'],'status'=>$row['status']];
}
