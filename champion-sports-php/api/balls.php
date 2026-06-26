<?php
require_once __DIR__ . '/../includes/auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$inningsId = $_GET['inningsId'] ?? null;

if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare("SELECT b.*,s.name AS striker_name,ns.name AS non_striker_name,bw.name AS bowler_name,f.name AS fielder_name FROM balls b LEFT JOIN players s ON b.striker_id=s.id LEFT JOIN players ns ON b.non_striker_id=ns.id LEFT JOIN players bw ON b.bowler_id=bw.id LEFT JOIN players f ON b.fielder_id=f.id WHERE b.id=?");
        $stmt->execute([$id]);
        jsonResponse(formatBall($stmt->fetch()));
    } else {
        $stmt = $db->prepare("SELECT b.*,s.name AS striker_name,ns.name AS non_striker_name,bw.name AS bowler_name,f.name AS fielder_name FROM balls b LEFT JOIN players s ON b.striker_id=s.id LEFT JOIN players ns ON b.non_striker_id=ns.id LEFT JOIN players bw ON b.bowler_id=bw.id LEFT JOIN players f ON b.fielder_id=f.id WHERE b.innings_id=? ORDER BY b.over_number,b.ball_number");
        $stmt->execute([$inningsId ?? 0]);
        jsonResponse(array_map('formatBall', $stmt->fetchAll()));
    }
} elseif ($method === 'POST') {
    $d = getInput();
    $stmt = $db->prepare("INSERT INTO balls (innings_id,over_number,ball_number,striker_id,non_striker_id,bowler_id,runs,extra_type,extra_runs,is_wicket,wicket_type,fielder_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->execute([$d['inningsId']??null,$d['overNumber']??0,$d['ballNumber']??0,$d['strikerId']??null,$d['nonStrikerId']??null,$d['bowlerId']??null,$d['runs']??0,$d['extraType']??null,$d['extraRuns']??0,(int)($d['isWicket']??0),$d['wicketType']??null,$d['fielderId']??null]);
    $newId = $db->lastInsertId();
    // Update innings score
    $inn = $db->prepare("SELECT * FROM innings WHERE id=?");
    $inn->execute([$d['inningsId']]);
    $innings = $inn->fetch();
    if ($innings) {
        $runs = $innings['runs'] + ($d['runs']??0) + ($d['extraRuns']??0);
        $wickets = $innings['wickets'] + ((int)($d['isWicket']??0));
        $balls = $innings['balls'] + 1;
        $overs = $innings['overs'];
        if ($balls >= 6) { $balls = 0; $overs++; }
        $db->prepare("UPDATE innings SET runs=?,wickets=?,overs=?,balls=? WHERE id=?")->execute([$runs,$wickets,$overs,$balls,$d['inningsId']]);
        // Update batting stats
        if ($d['strikerId']??null) {
            $bs = $db->prepare("SELECT id FROM batting_stats WHERE innings_id=? AND player_id=?");
            $bs->execute([$d['inningsId'],$d['strikerId']]);
            $bsRow = $bs->fetch();
            $r = (int)($d['runs']??0); $fours = ($r==4)?1:0; $sixes = ($r==6)?1:0;
            if ($bsRow) {
                $db->prepare("UPDATE batting_stats SET runs=runs+?,balls=balls+1,fours=fours+?,sixes=sixes+?,is_out=? WHERE id=?")->execute([$r,$fours,$sixes,(int)($d['isWicket']??0),$bsRow['id']]);
            } else {
                $db->prepare("INSERT INTO batting_stats (innings_id,player_id,runs,balls,fours,sixes,is_out) VALUES (?,?,?,1,?,?,?)")->execute([$d['inningsId'],$d['strikerId'],$r,$fours,$sixes,(int)($d['isWicket']??0)]);
            }
        }
        // Update bowling stats
        if ($d['bowlerId']??null) {
            $bwRow = $db->prepare("SELECT id,overs FROM bowling_stats WHERE innings_id=? AND player_id=?");
            $bwRow->execute([$d['inningsId'],$d['bowlerId']]);
            $bwStats = $bwRow->fetch();
            $wkts = (int)($d['isWicket']??0); $rcRuns = ($d['runs']??0)+($d['extraRuns']??0);
            if ($bwStats) {
                $curOvers = $bwStats['overs']; $curBalls = round(($curOvers - floor($curOvers)) * 10); $curBalls++;
                $newOvers = floor($curOvers) + ($curBalls >= 6 ? 1 : 0) + (($curBalls >= 6 ? 0 : $curBalls) / 10);
                $db->prepare("UPDATE bowling_stats SET overs=?,runs_conceded=runs_conceded+?,wickets=wickets+? WHERE id=?")->execute([$newOvers,$rcRuns,$wkts,$bwStats['id']]);
            } else {
                $db->prepare("INSERT INTO bowling_stats (innings_id,player_id,overs,runs_conceded,wickets) VALUES (?,?,0.1,?,?)")->execute([$d['inningsId'],$d['bowlerId'],$rcRuns,$wkts]);
            }
        }
    }
    $stmt2 = $db->prepare("SELECT b.*,s.name AS striker_name,ns.name AS non_striker_name,bw.name AS bowler_name,f.name AS fielder_name FROM balls b LEFT JOIN players s ON b.striker_id=s.id LEFT JOIN players ns ON b.non_striker_id=ns.id LEFT JOIN players bw ON b.bowler_id=bw.id LEFT JOIN players f ON b.fielder_id=f.id WHERE b.id=?");
    $stmt2->execute([$newId]);
    jsonResponse(formatBall($stmt2->fetch()));
} elseif ($method === 'DELETE') {
    $action = $_GET['action'] ?? null;
    $pathInfo = $_SERVER['PATH_INFO'] ?? $_SERVER['ORIG_PATH_INFO'] ?? null;
    if ($pathInfo) {
        $parts = explode('/', trim($pathInfo, '/'));
        if (count($parts) >= 2 && $parts[0] === 'undo') {
            $action = 'undo';
            $inningsId = (int)$parts[1];
        }
    }

    if ($action === 'undo' && $inningsId) {
        // Find last ball of the innings
        $stmt = $db->prepare("SELECT * FROM balls WHERE innings_id=? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$inningsId]);
        $lastBall = $stmt->fetch();
        if (!$lastBall) jsonResponse(['error'=>'No balls to undo'],400);

        // Delete it
        $db->prepare("DELETE FROM balls WHERE id=?")->execute([$lastBall['id']]);

        // Re-calculate the entire innings from scratch to keep it completely in sync
        recalculateInningsStats($db, $inningsId);

        jsonResponse(['success'=>true]);
    } else {
        if (!$id) jsonResponse(['error'=>'ID required'],400);
        $db->prepare("DELETE FROM balls WHERE id=?")->execute([$id]);
        jsonResponse(['success'=>true]);
    }
}

function recalculateInningsStats(PDO $db, int $inningsId): void {
    // Fetch all balls for this innings chronologically
    $stmt = $db->prepare("SELECT * FROM balls WHERE innings_id=? ORDER BY id ASC");
    $stmt->execute([$inningsId]);
    $balls = $stmt->fetchAll();

    // Reset innings stats
    $totalRuns = 0;
    $totalWickets = 0;
    $totalOvers = 0;
    $totalBallsInOver = 0;
    $totalExtras = 0;

    // Clear current batting & bowling stats for this innings
    $db->prepare("DELETE FROM batting_stats WHERE innings_id=?")->execute([$inningsId]);
    $db->prepare("DELETE FROM bowling_stats WHERE innings_id=?")->execute([$inningsId]);

    // Process each ball to reconstruct stats
    foreach ($balls as $ball) {
        $runs = (int)$ball['runs'];
        $extraRuns = (int)$ball['extra_runs'];
        $extraType = $ball['extra_type'];
        $isWicket = (int)$ball['is_wicket'];
        $strikerId = $ball['striker_id'];
        $bowlerId = $ball['bowler_id'];

        $totalRuns += ($runs + $extraRuns);
        $totalWickets += $isWicket;
        if ($extraType) {
            $totalExtras += $extraRuns;
        }

        $totalBallsInOver++;
        if ($totalBallsInOver >= 6) {
            $totalBallsInOver = 0;
            $totalOvers++;
        }

        // Batting stats
        if ($strikerId) {
            $bs = $db->prepare("SELECT id FROM batting_stats WHERE innings_id=? AND player_id=?");
            $bs->execute([$inningsId, $strikerId]);
            $bsRow = $bs->fetch();
            $fours = ($runs == 4) ? 1 : 0;
            $sixes = ($runs == 6) ? 1 : 0;
            if ($bsRow) {
                $db->prepare("UPDATE batting_stats SET runs=runs+?, balls=balls+1, fours=fours+?, sixes=sixes+?, is_out=? WHERE id=?")->execute([$runs, $fours, $sixes, $isWicket, $bsRow['id']]);
            } else {
                $db->prepare("INSERT INTO batting_stats (innings_id, player_id, runs, balls, fours, sixes, is_out) VALUES (?, ?, ?, 1, ?, ?, ?)")->execute([$inningsId, $strikerId, $runs, $fours, $sixes, $isWicket]);
            }
        }

        // Bowling stats
        if ($bowlerId) {
            $bw = $db->prepare("SELECT id, overs FROM bowling_stats WHERE innings_id=? AND player_id=?");
            $bw->execute([$inningsId, $bowlerId]);
            $bwRow = $bw->fetch();
            $rcRuns = $runs + $extraRuns;
            if ($bwRow) {
                $curOvers = $bwRow['overs'];
                $curBalls = round(($curOvers - floor($curOvers)) * 10);
                $curBalls++;
                $newOvers = floor($curOvers) + ($curBalls >= 6 ? 1 : 0) + (($curBalls >= 6 ? 0 : $curBalls) / 10);
                $db->prepare("UPDATE bowling_stats SET overs=?, runs_conceded=runs_conceded+?, wickets=wickets+? WHERE id=?")->execute([$newOvers, $rcRuns, $isWicket, $bwRow['id']]);
            } else {
                $db->prepare("INSERT INTO bowling_stats (innings_id, player_id, overs, runs_conceded, wickets) VALUES (?, ?, 0.1, ?, ?)")->execute([$inningsId, $bowlerId, $rcRuns, $isWicket]);
            }
        }
    }

    // Save recalculated values back to innings
    $db->prepare("UPDATE innings SET runs=?, wickets=?, overs=?, balls=?, extras=? WHERE id=?")->execute([$totalRuns, $totalWickets, $totalOvers, $totalBallsInOver, $totalExtras, $inningsId]);
}

function formatBall(array $row): array {
    return [
        'id'          => (int)$row['id'],
        'inningsId'   => (int)$row['innings_id'],
        'overNumber'  => (int)$row['over_number'],
        'ballNumber'  => (int)$row['ball_number'],
        'runs'        => (int)$row['runs'],
        'extraType'   => $row['extra_type'],
        'extraRuns'   => (int)$row['extra_runs'],
        'isWicket'    => (bool)$row['is_wicket'],
        'wicketType'  => $row['wicket_type'],
        'striker'     => $row['striker_id']     ? ['id'=>(int)$row['striker_id'],'name'=>$row['striker_name']] : null,
        'nonStriker'  => $row['non_striker_id'] ? ['id'=>(int)$row['non_striker_id'],'name'=>$row['non_striker_name']] : null,
        'bowler'      => $row['bowler_id']      ? ['id'=>(int)$row['bowler_id'],'name'=>$row['bowler_name']] : null,
        'fielder'     => $row['fielder_id']     ? ['id'=>(int)$row['fielder_id'],'name'=>$row['fielder_name']] : null,
    ];
}
