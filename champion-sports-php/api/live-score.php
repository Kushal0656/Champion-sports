<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
if (!$id) jsonResponse(['error'=>'inningsId required'],400);

// Get innings
$stmt = $db->prepare("SELECT i.*,
                             bt.name AS batting_team_name, bt.short_name AS batting_team_short,
                             bwt.name AS bowling_team_name, bwt.short_name AS bowling_team_short,
                             ps.name AS striker_name,
                             pns.name AS non_striker_name,
                             pb.name AS bowler_name
                      FROM innings i 
                      LEFT JOIN teams bt ON i.batting_team_id=bt.id 
                      LEFT JOIN teams bwt ON i.bowling_team_id=bwt.id 
                      LEFT JOIN players ps ON i.striker_id=ps.id
                      LEFT JOIN players pns ON i.non_striker_id=pns.id
                      LEFT JOIN players pb ON i.current_bowler_id=pb.id
                      WHERE i.id=?");
$stmt->execute([$id]);
$innings = $stmt->fetch();
if (!$innings) jsonResponse(['error'=>'Innings not found'],404);

// Get batting stats
$bStats = $db->prepare("SELECT bs.*,p.name AS player_name FROM batting_stats bs LEFT JOIN players p ON bs.player_id=p.id WHERE bs.innings_id=? ORDER BY bs.batting_position,bs.id");
$bStats->execute([$id]);
$batting = $bStats->fetchAll();

// Get bowling stats
$bwStats = $db->prepare("SELECT bw.*,p.name AS player_name FROM bowling_stats bw LEFT JOIN players p ON bw.player_id=p.id WHERE bw.innings_id=? ORDER BY bw.id");
$bwStats->execute([$id]);
$bowling = $bwStats->fetchAll();

// Get last 20 balls (recent history)
$balls = $db->prepare("SELECT b.*,s.name AS striker_name,bw.name AS bowler_name FROM balls b LEFT JOIN players s ON b.striker_id=s.id LEFT JOIN players bw ON b.bowler_id=bw.id WHERE b.innings_id=? ORDER BY b.over_number DESC,b.ball_number DESC LIMIT 20");
$balls->execute([$id]);
$recentBalls = $balls->fetchAll();

jsonResponse([
    'innings' => [
        'id'           => (int)$innings['id'],
        'inningsNumber'=> (int)$innings['innings_number'],
        'runs'         => (int)$innings['runs'],
        'wickets'      => (int)$innings['wickets'],
        'overs'        => (int)$innings['overs'],
        'balls'        => (int)$innings['balls'],
        'extras'       => (int)$innings['extras'],
        'target'       => $innings['target'] ? (int)$innings['target'] : null,
        'completed'    => (bool)($innings['completed'] ?? false),
        'battingTeam'  => $innings['batting_team_id']  ? ['id'=>(int)$innings['batting_team_id'],'name'=>$innings['batting_team_name'],'shortName'=>$innings['batting_team_short']] : null,
        'bowlingTeam'  => $innings['bowling_team_id']  ? ['id'=>(int)$innings['bowling_team_id'],'name'=>$innings['bowling_team_name'],'shortName'=>$innings['bowling_team_short']] : null,
        'striker'      => $innings['striker_id'] ? ['id'=>(int)$innings['striker_id'],'name'=>$innings['striker_name']] : null,
        'nonStriker'   => $innings['non_striker_id'] ? ['id'=>(int)$innings['non_striker_id'],'name'=>$innings['non_striker_name']] : null,
        'currentBowler'=> $innings['current_bowler_id'] ? ['id'=>(int)$innings['current_bowler_id'],'name'=>$innings['bowler_name']] : null,
    ],
    'batting' => array_map(fn($r) => [
        'id'    => (int)$r['id'],
        'runs'  => (int)$r['runs'],
        'balls' => (int)$r['balls'],
        'fours' => (int)$r['fours'],
        'sixes' => (int)$r['sixes'],
        'out'   => (bool)$r['is_out'],
        'player'=> ['id'=>(int)$r['player_id'],'name'=>$r['player_name']],
    ], $batting),
    'bowling' => array_map(fn($r) => [
        'id'           => (int)$r['id'],
        'overs'        => (float)$r['overs'],
        'runsConceded' => (int)$r['runs_conceded'],
        'wickets'      => (int)$r['wickets'],
        'player'       => ['id'=>(int)$r['player_id'],'name'=>$r['player_name']],
    ], $bowling),
    'recentBalls' => array_map(fn($r) => [
        'over'       => (int)$r['over_number'],
        'ball'       => (int)$r['ball_number'],
        'runs'       => (int)$r['runs'],
        'isWicket'   => (bool)$r['is_wicket'],
        'extraType'  => $r['extra_type'],
        'striker'    => $r['striker_id'] ? ['name'=>$r['striker_name']] : null,
        'bowler'     => $r['bowler_id']  ? ['name'=>$r['bowler_name']]  : null,
    ], $recentBalls),
]);
