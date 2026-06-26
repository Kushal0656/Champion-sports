<?php
require_once __DIR__ . '/../includes/auth.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $db->prepare("
                SELECT m.*, 
                       ta.name AS team_a_name, ta.short_name AS team_a_short, ta.logo_path AS team_a_logo,
                       tb.name AS team_b_name, tb.short_name AS team_b_short, tb.logo_path AS team_b_logo,
                       tw.name AS toss_winner_name,
                       w.name  AS winner_name
                FROM matches m
                LEFT JOIN teams ta ON m.team_a_id = ta.id
                LEFT JOIN teams tb ON m.team_b_id = tb.id
                LEFT JOIN teams tw ON m.toss_winner_id = tw.id
                LEFT JOIN teams w  ON m.winner_id = w.id
                WHERE m.id = ?
            ");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) jsonResponse(['error'=>'Not found'], 404);
            jsonResponse(formatMatch($row));
        } else {
            $stmt = $db->query("
                SELECT m.*,
                       ta.name AS team_a_name, ta.short_name AS team_a_short, ta.logo_path AS team_a_logo,
                       tb.name AS team_b_name, tb.short_name AS team_b_short, tb.logo_path AS team_b_logo,
                       tw.name AS toss_winner_name,
                       w.name  AS winner_name
                FROM matches m
                LEFT JOIN teams ta ON m.team_a_id = ta.id
                LEFT JOIN teams tb ON m.team_b_id = tb.id
                LEFT JOIN teams tw ON m.toss_winner_id = tw.id
                LEFT JOIN teams w  ON m.winner_id = w.id
                ORDER BY m.id DESC
            ");
            jsonResponse(array_map('formatMatch', $stmt->fetchAll()));
        }
        break;

    case 'POST':
        $action = $_GET['action'] ?? null;
        if ($action === 'complete') {
            if (!$id) jsonResponse(['error' => 'ID required'], 400);
            
            // Fetch innings
            $innStmt = $db->prepare("SELECT * FROM innings WHERE match_id = ? ORDER BY innings_number ASC");
            $innStmt->execute([$id]);
            $inningsList = $innStmt->fetchAll();
            
            if (count($inningsList) < 2) {
                jsonResponse(['error' => 'Match has no innings yet or incomplete innings'], 400);
            }
            
            $first = $inningsList[0];
            $second = $inningsList[1];
            
            $runs1 = (int)$first['runs'];
            $runs2 = (int)$second['runs'];
            $wickets2 = (int)$second['wickets'];
            
            // Fetch match details to get team A & B IDs
            $mStmt = $db->prepare("SELECT * FROM matches WHERE id = ?");
            $mStmt->execute([$id]);
            $matchRow = $mStmt->fetch();
            if (!$matchRow) jsonResponse(['error' => 'Match not found'], 404);
            
            $winnerId = null;
            $resultMargin = '';
            
            if ($runs2 > $runs1) {
                $winnerId = $second['batting_team_id'];
                $resultMargin = 'Won by ' . (10 - $wickets2) . ' wickets';
            } elseif ($runs1 > $runs2) {
                $winnerId = $first['batting_team_id'];
                $resultMargin = 'Won by ' . ($runs1 - $runs2) . ' runs';
            } else {
                $winnerId = null;
                $resultMargin = 'Match Tied';
            }
            
            $updateStmt = $db->prepare("UPDATE matches SET status = 'COMPLETED', winner_id = ?, result_margin = ? WHERE id = ?");
            $updateStmt->execute([$winnerId ?: null, $resultMargin, $id]);
            
            $stmt2 = $db->prepare("SELECT m.*,ta.name AS team_a_name,ta.short_name AS team_a_short,ta.logo_path AS team_a_logo,tb.name AS team_b_name,tb.short_name AS team_b_short,tb.logo_path AS team_b_logo,tw.name AS toss_winner_name,w.name AS winner_name FROM matches m LEFT JOIN teams ta ON m.team_a_id=ta.id LEFT JOIN teams tb ON m.team_b_id=tb.id LEFT JOIN teams tw ON m.toss_winner_id=tw.id LEFT JOIN teams w ON m.winner_id=w.id WHERE m.id=?");
            $stmt2->execute([$id]);
            jsonResponse(formatMatch($stmt2->fetch()));
        } else {
            $d = getInput();
            $stmt = $db->prepare("INSERT INTO matches (team_a_id,team_b_id,venue,match_date,status,stream_url) VALUES (?,?,?,?,?,?)");
            $stmt->execute([$d['teamAId']??null, $d['teamBId']??null, $d['venue']??'', $d['matchDate']??null, $d['status']??'SCHEDULED', $d['streamUrl']??null]);
            $newId = $db->lastInsertId();
            $stmt2 = $db->prepare("SELECT m.*,ta.name AS team_a_name,ta.short_name AS team_a_short,ta.logo_path AS team_a_logo,tb.name AS team_b_name,tb.short_name AS team_b_short,tb.logo_path AS team_b_logo,tw.name AS toss_winner_name,w.name AS winner_name FROM matches m LEFT JOIN teams ta ON m.team_a_id=ta.id LEFT JOIN teams tb ON m.team_b_id=tb.id LEFT JOIN teams tw ON m.toss_winner_id=tw.id LEFT JOIN teams w ON m.winner_id=w.id WHERE m.id=?");
            $stmt2->execute([$newId]);
            jsonResponse(formatMatch($stmt2->fetch()));
        }
        break;

    case 'PUT':
        if (!$id) jsonResponse(['error'=>'ID required'], 400);
        $d = getInput();
        $stmt = $db->prepare("UPDATE matches SET team_a_id=?,team_b_id=?,venue=?,match_date=?,status=?,toss_winner_id=?,toss_decision=?,winner_id=?,result_margin=?,stream_url=?,current_innings=? WHERE id=?");
        $stmt->execute([$d['teamAId']??null,$d['teamBId']??null,$d['venue']??'',$d['matchDate']??null,$d['status']??'SCHEDULED',$d['tossWinnerId']??null,$d['tossDecision']??null,$d['winnerId']??null,$d['resultMargin']??null,$d['streamUrl']??null,$d['currentInnings']??1,$id]);
        $stmt2 = $db->prepare("SELECT m.*,ta.name AS team_a_name,ta.short_name AS team_a_short,ta.logo_path AS team_a_logo,tb.name AS team_b_name,tb.short_name AS team_b_short,tb.logo_path AS team_b_logo,tw.name AS toss_winner_name,w.name AS winner_name FROM matches m LEFT JOIN teams ta ON m.team_a_id=ta.id LEFT JOIN teams tb ON m.team_b_id=tb.id LEFT JOIN teams tw ON m.toss_winner_id=tw.id LEFT JOIN teams w ON m.winner_id=w.id WHERE m.id=?");
        $stmt2->execute([$id]);
        jsonResponse(formatMatch($stmt2->fetch()));
        break;

    case 'DELETE':
        if (!$id) jsonResponse(['error'=>'ID required'], 400);
        $db->prepare("DELETE FROM matches WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
        break;

    default:
        jsonResponse(['error'=>'Method not allowed'], 405);
}

function formatMatch(array $row): array {
    return [
        'id'            => (int)$row['id'],
        'venue'         => $row['venue'],
        'matchDate'     => $row['match_date'],
        'status'        => $row['status'],
        'currentInnings'=> (int)$row['current_innings'],
        'tossDecision'  => $row['toss_decision'],
        'resultMargin'  => $row['result_margin'],
        'streamUrl'     => $row['stream_url'],
        'teamA'         => $row['team_a_id'] ? ['id'=>(int)$row['team_a_id'],'name'=>$row['team_a_name'],'shortName'=>$row['team_a_short'],'logoPath'=>$row['team_a_logo']] : null,
        'teamB'         => $row['team_b_id'] ? ['id'=>(int)$row['team_b_id'],'name'=>$row['team_b_name'],'shortName'=>$row['team_b_short'],'logoPath'=>$row['team_b_logo']] : null,
        'tossWinner'    => $row['toss_winner_id'] ? ['id'=>(int)$row['toss_winner_id'],'name'=>$row['toss_winner_name']] : null,
        'winner'        => $row['winner_id'] ? ['id'=>(int)$row['winner_id'],'name'=>$row['winner_name']] : null,
    ];
}
