<?php
require_once __DIR__ . '/auth.php';
$key = getAuthorizedKey();
requirePermission($key, 'EVENTS');

$db = getDB();
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
$rows = $stmt->fetchAll();

// Format response to match Spring Boot representation
$events = array_map(function($row) {
    return [
        'id'            => (int)$row['id'],
        'venue'         => $row['venue'],
        'matchDate'     => $row['match_date'],
        'status'        => $row['status'],
        'currentInnings'=> (int)$row['current_innings'],
        'tossDecision'  => $row['toss_decision'],
        'resultMargin'  => $row['result_margin'],
        'streamUrl'     => $row['stream_url'],
        'teamA'         => $row['team_a_id'] ? ['id'=>(int)$row['team_a_id'],'name'=>$row['team_a_name'],'shortName'=>$row['team_a_short']] : null,
        'teamB'         => $row['team_b_id'] ? ['id'=>(int)$row['team_b_id'],'name'=>$row['team_b_name'],'shortName'=>$row['team_b_short']] : null,
        'tossWinner'    => $row['toss_winner_id'] ? ['id'=>(int)$row['toss_winner_id'],'name'=>$row['toss_winner_name']] : null,
        'winner'        => $row['winner_id'] ? ['id'=>(int)$row['winner_id'],'name'=>$row['winner_name']] : null,
    ];
}, $rows);

jsonResponse($events);
