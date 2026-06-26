<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
    $tournamentId = $_GET['tournamentId'] ?? null;
    if ($tournamentId) {
        $stmt = $db->prepare("SELECT tt.*,t.name AS team_name,t.short_name,t.logo_path,tn.name AS tournament_name FROM tournament_teams tt LEFT JOIN teams t ON tt.team_id=t.id LEFT JOIN tournaments tn ON tt.tournament_id=tn.id WHERE tt.tournament_id=?");
        $stmt->execute([$tournamentId]);
    } else {
        $stmt = $db->query("SELECT tt.*,t.name AS team_name,t.short_name,t.logo_path,tn.name AS tournament_name FROM tournament_teams tt LEFT JOIN teams t ON tt.team_id=t.id LEFT JOIN tournaments tn ON tt.tournament_id=tn.id ORDER BY tt.id");
    }
    jsonResponse(array_map('formatTT', $stmt->fetchAll()));
} elseif ($method === 'POST') {
    $d = getInput();
    // Check existing
    $chk = $db->prepare("SELECT id FROM tournament_teams WHERE tournament_id=? AND team_id=?");
    $chk->execute([$d['tournamentId']??null,$d['teamId']??null]);
    if ($chk->fetch()) jsonResponse(['error'=>'Already added'],409);
    $stmt = $db->prepare("INSERT INTO tournament_teams (tournament_id,team_id) VALUES (?,?)");
    $stmt->execute([$d['tournamentId']??null,$d['teamId']??null]);
    $newId = $db->lastInsertId();
    $stmt2 = $db->prepare("SELECT tt.*,t.name AS team_name,t.short_name,t.logo_path,tn.name AS tournament_name FROM tournament_teams tt LEFT JOIN teams t ON tt.team_id=t.id LEFT JOIN tournaments tn ON tt.tournament_id=tn.id WHERE tt.id=?");
    $stmt2->execute([$newId]);
    jsonResponse(formatTT($stmt2->fetch()));
} elseif ($method === 'DELETE') {
    if (!$id) jsonResponse(['error'=>'ID required'],400);
    $db->prepare("DELETE FROM tournament_teams WHERE id=?")->execute([$id]);
    jsonResponse(['success'=>true]);
}

function formatTT(array $r): array {
    return ['id'=>(int)$r['id'],'tournamentId'=>(int)$r['tournament_id'],'tournamentName'=>$r['tournament_name'],'team'=>['id'=>(int)$r['team_id'],'name'=>$r['team_name'],'shortName'=>$r['short_name'],'logoUrl'=>$r['logo_path']?UPLOAD_URL.'teams/'.$r['logo_path']:null]];
}
