<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Handle path info mapping
$pathInfo = $_SERVER['PATH_INFO'] ?? $_SERVER['ORIG_PATH_INFO'] ?? null;
$action = $_GET['action'] ?? null;
if ($pathInfo) {
    $parts = explode('/', trim($pathInfo, '/'));
    if (count($parts) >= 2 && $parts[0] === 'personnel') {
        $action = 'personnel';
        $id = (int)$parts[1];
    }
}

switch ($method) {
    case 'GET':
        $select = "SELECT i.*, 
                          bt.name AS batting_team_name, bt.short_name AS batting_team_short, 
                          bwt.name AS bowling_team_name, bwt.short_name AS bowling_team_short, 
                          m.team_a_id, m.team_b_id,
                          ps.name AS striker_name,
                          pns.name AS non_striker_name,
                          pb.name AS bowler_name
                   FROM innings i 
                   LEFT JOIN teams bt ON i.batting_team_id=bt.id 
                   LEFT JOIN teams bwt ON i.bowling_team_id=bwt.id 
                   LEFT JOIN matches m ON i.match_id=m.id 
                   LEFT JOIN players ps ON i.striker_id=ps.id
                   LEFT JOIN players pns ON i.non_striker_id=pns.id
                   LEFT JOIN players pb ON i.current_bowler_id=pb.id";
                   
        if ($id) {
            $stmt = $db->prepare("$select WHERE i.id=?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(['error'=>'Not found'],404);
            jsonResponse(formatInnings($row));
        } else {
            $matchId = $_GET['matchId'] ?? null;
            if ($matchId) {
                $stmt = $db->prepare("$select WHERE i.match_id=? ORDER BY i.innings_number");
                $stmt->execute([$matchId]);
            } else {
                $stmt = $db->query("$select ORDER BY i.id DESC");
            }
            jsonResponse(array_map('formatInnings', $stmt->fetchAll()));
        }
        break;

    case 'POST':
        $d = getInput();
        $matchId = $d['matchId'] ?? $d['match']['id'] ?? null;
        $battingTeamId = $d['battingTeamId'] ?? $d['battingTeam']['id'] ?? null;
        $bowlingTeamId = $d['bowlingTeamId'] ?? $d['bowlingTeam']['id'] ?? null;
        $inningsNumber = $d['inningsNumber'] ?? 1;
        $target = $d['target'] ?? null;

        $stmt = $db->prepare("INSERT INTO innings (match_id,innings_number,batting_team_id,bowling_team_id,target) VALUES (?,?,?,?,?)");
        $stmt->execute([$matchId, $inningsNumber, $battingTeamId, $bowlingTeamId, $target]);
        $newId = $db->lastInsertId();
        
        $select = "SELECT i.*, 
                          bt.name AS batting_team_name, bt.short_name AS batting_team_short, 
                          bwt.name AS bowling_team_name, bwt.short_name AS bowling_team_short, 
                          m.team_a_id, m.team_b_id,
                          ps.name AS striker_name,
                          pns.name AS non_striker_name,
                          pb.name AS bowler_name
                   FROM innings i 
                   LEFT JOIN teams bt ON i.batting_team_id=bt.id 
                   LEFT JOIN teams bwt ON i.bowling_team_id=bwt.id 
                   LEFT JOIN matches m ON i.match_id=m.id 
                   LEFT JOIN players ps ON i.striker_id=ps.id
                   LEFT JOIN players pns ON i.non_striker_id=pns.id
                   LEFT JOIN players pb ON i.current_bowler_id=pb.id";
        $stmt2 = $db->prepare("$select WHERE i.id=?");
        $stmt2->execute([$newId]);
        jsonResponse(formatInnings($stmt2->fetch()));
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $d = getInput();
        
        if ($action === 'personnel') {
            $strikerId = $_GET['strikerId'] ?? $_POST['strikerId'] ?? $d['strikerId'] ?? null;
            $nonStrikerId = $_GET['nonStrikerId'] ?? $_POST['nonStrikerId'] ?? $d['nonStrikerId'] ?? null;
            $bowlerId = $_GET['bowlerId'] ?? $_POST['bowlerId'] ?? $d['bowlerId'] ?? null;
            
            $stmt = $db->prepare("UPDATE innings SET striker_id=?,non_striker_id=?,current_bowler_id=? WHERE id=?");
            $stmt->execute([$strikerId?:null,$nonStrikerId?:null,$bowlerId?:null,$id]);
        } else {
            $stmt = $db->prepare("UPDATE innings SET runs=?,wickets=?,overs=?,balls=?,extras=?,target=?,batting_team_id=?,bowling_team_id=?,striker_id=?,non_striker_id=?,current_bowler_id=?,completed=? WHERE id=?");
            $stmt->execute([
                $d['runs']??0,
                $d['wickets']??0,
                $d['overs']??0,
                $d['balls']??0,
                $d['extras']??0,
                $d['target']??null,
                $d['battingTeamId']??null,
                $d['bowlingTeamId']??null,
                $d['strikerId']??null,
                $d['nonStrikerId']??null,
                $d['bowlerId']??null,
                (int)($d['completed']??0),
                $id
            ]);
        }
        
        $select = "SELECT i.*, 
                          bt.name AS batting_team_name, bt.short_name AS batting_team_short, 
                          bwt.name AS bowling_team_name, bwt.short_name AS bowling_team_short, 
                          m.team_a_id, m.team_b_id,
                          ps.name AS striker_name,
                          pns.name AS non_striker_name,
                          pb.name AS bowler_name
                   FROM innings i 
                   LEFT JOIN teams bt ON i.batting_team_id=bt.id 
                   LEFT JOIN teams bwt ON i.bowling_team_id=bwt.id 
                   LEFT JOIN matches m ON i.match_id=m.id 
                   LEFT JOIN players ps ON i.striker_id=ps.id
                   LEFT JOIN players pns ON i.non_striker_id=pns.id
                   LEFT JOIN players pb ON i.current_bowler_id=pb.id";
        $stmt2 = $db->prepare("$select WHERE i.id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatInnings($stmt2->fetch()));
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $db->prepare("DELETE FROM innings WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;
}

function formatInnings(array $row): array {
    return [
        'id'           => (int)$row['id'],
        'inningsNumber'=> (int)$row['innings_number'],
        'runs'         => (int)$row['runs'],
        'wickets'      => (int)$row['wickets'],
        'overs'        => (int)$row['overs'],
        'balls'        => (int)$row['balls'],
        'extras'       => (int)$row['extras'],
        'target'       => $row['target'] ? (int)$row['target'] : null,
        'completed'    => (bool)($row['completed'] ?? false),
        'match'        => $row['match_id'] ? ['id'=>(int)$row['match_id'],'teamAId'=>(int)$row['team_a_id'],'teamBId'=>(int)$row['team_b_id']] : null,
        'battingTeam'  => $row['batting_team_id'] ? ['id'=>(int)$row['batting_team_id'],'name'=>$row['batting_team_name'],'shortName'=>$row['batting_team_short']] : null,
        'bowlingTeam'  => $row['bowling_team_id'] ? ['id'=>(int)$row['bowling_team_id'],'name'=>$row['bowling_team_name'],'shortName'=>$row['bowling_team_short']] : null,
        'striker'      => $row['striker_id'] ? ['id'=>(int)$row['striker_id'],'name'=>$row['striker_name']] : null,
        'nonStriker'   => $row['non_striker_id'] ? ['id'=>(int)$row['non_striker_id'],'name'=>$row['non_striker_name']] : null,
        'currentBowler'=> $row['current_bowler_id'] ? ['id'=>(int)$row['current_bowler_id'],'name'=>$row['bowler_name']] : null,
    ];
}
