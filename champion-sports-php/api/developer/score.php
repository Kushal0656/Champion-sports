<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'SCORE');

$db = getDB();
$eventId = isset($_GET['eventId']) ? (int)$_GET['eventId'] : null;

if (!$eventId) {
    jsonResponse(['error' => 'eventId parameter is required'], 400);
}

// Fetch match
$stmt = $db->prepare("
    SELECT m.*, 
           ta.name AS team_a_name, 
           tb.name AS team_b_name,
           tw.name AS toss_winner_name
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
    LEFT JOIN teams tw ON m.toss_winner_id = tw.id
    WHERE m.id = ?
");
$stmt->execute([$eventId]);
$match = $stmt->fetch();

if (!$match) {
    jsonResponse(['error' => 'Match not found'], 404);
}

// Fetch innings scorecard states
$innStmt = $db->prepare("SELECT id FROM innings WHERE match_id = ? ORDER BY innings_number");
$innStmt->execute([$eventId]);
$inningsIds = $innStmt->fetchAll(PDO::FETCH_COLUMN);

$inningsScorecards = [];
foreach ($inningsIds as $innId) {
    // Re-use live score logic
    $innData = getInningsScoreData($db, $innId);
    if ($innData) {
        $inningsScorecards[] = $innData;
    }
}

jsonResponse([
    'eventId'      => (int)$match['id'],
    'status'       => $match['status'] ?? 'SCHEDULED',
    'venue'        => $match['venue'],
    'matchDate'    => $match['match_date'],
    'teamA'        => $match['team_a_name'] ?? '',
    'teamB'        => $match['team_b_name'] ?? '',
    'tossWinner'   => $match['toss_winner_name'] ?? '',
    'tossDecision' => $match['toss_decision'] ?? '',
    'scorecard'    => [
        'innings'  => $inningsScorecards
    ]
]);

function getInningsScoreData(PDO $db, int $id): ?array {
    $stmt = $db->prepare("SELECT i.*, bt.name AS batting_team_name, bwt.name AS bowling_team_name FROM innings i LEFT JOIN teams bt ON i.batting_team_id=bt.id LEFT JOIN teams bwt ON i.bowling_team_id=bwt.id WHERE i.id=?");
    $stmt->execute([$id]);
    $innings = $stmt->fetch();
    if (!$innings) return null;

    $bStats = $db->prepare("SELECT bs.*, p.name AS player_name FROM batting_stats bs LEFT JOIN players p ON bs.player_id=p.id WHERE bs.innings_id=? ORDER BY bs.batting_position, bs.id");
    $bStats->execute([$id]);
    $batting = $bStats->fetchAll();

    $bwStats = $db->prepare("SELECT bw.*, p.name AS player_name FROM bowling_stats bw LEFT JOIN players p ON bw.player_id=p.id WHERE bw.innings_id=? ORDER BY bw.id");
    $bwStats->execute([$id]);
    $bowling = $bwStats->fetchAll();

    return [
        'inningsNumber'=> (int)$innings['innings_number'],
        'runs'         => (int)$innings['runs'],
        'wickets'      => (int)$innings['wickets'],
        'overs'        => (int)$innings['overs'],
        'balls'        => (int)$innings['balls'],
        'extras'       => (int)$innings['extras'],
        'target'       => $innings['target'] ? (int)$innings['target'] : null,
        'battingTeam'  => $innings['batting_team_name'] ?? '',
        'bowlingTeam'  => $innings['bowling_team_name'] ?? '',
        'batting'      => array_map(fn($r) => [
            'playerName' => $r['player_name'],
            'runs'       => (int)$r['runs'],
            'balls'      => (int)$r['balls'],
            'fours'      => (int)$r['fours'],
            'sixes'      => (int)$r['sixes'],
            'isOut'      => (bool)$r['is_out']
        ], $batting),
        'bowling'      => array_map(fn($r) => [
            'playerName'   => $r['player_name'],
            'overs'        => (float)$r['overs'],
            'runsConceded' => (int)$r['runs_conceded'],
            'wickets'      => (int)$r['wickets']
        ], $bowling)
    ];
}
