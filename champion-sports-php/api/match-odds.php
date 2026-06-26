<?php
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$matchId = isset($_GET['matchId']) ? (int)$_GET['matchId'] : null;

if (!$matchId) {
    jsonResponse(['error' => 'matchId parameter is required'], 400);
}

// Ensure the match exists
$stmt = $db->prepare("SELECT id FROM matches WHERE id = ?");
$stmt->execute([$matchId]);
if (!$stmt->fetch()) {
    jsonResponse(['error' => 'Match not found'], 404);
}

if ($method === 'GET') {
    // Fetch the match details
    $mStmt = $db->prepare("SELECT * FROM matches WHERE id = ?");
    $mStmt->execute([$matchId]);
    $match = $mStmt->fetch();
    if (!$match) {
        jsonResponse(['error' => 'Match not found'], 404);
    }

    $teamAId = $match['team_a_id'];
    $teamBId = $match['team_b_id'];
    $status = $match['status'];
    $winnerId = $match['winner_id'] ?? null;

    $probA = 0.5;
    $probB = 0.5;

    if ($status === 'COMPLETED') {
        if ($winnerId) {
            if ((int)$winnerId === (int)$teamAId) {
                $probA = 0.99;
                $probB = 0.01;
            } else {
                $probA = 0.01;
                $probB = 0.99;
            }
        } else {
            $probA = 0.5;
            $probB = 0.5;
        }
    } elseif ($status === 'LIVE') {
        // Fetch active innings (completed = 0 or latest)
        $innStmt = $db->prepare("SELECT * FROM innings WHERE match_id = ? ORDER BY innings_number DESC, id DESC LIMIT 1");
        $innStmt->execute([$matchId]);
        $innings = $innStmt->fetch();

        if ($innings) {
            $runs = (int)$innings['runs'];
            $wickets = (int)$innings['wickets'];
            $overs = (int)$innings['overs'];
            $balls = (int)$innings['balls'];
            $target = $innings['target'] ? (int)$innings['target'] : null;
            $battingTeamId = $innings['batting_team_id'];

            $total_balls_bowled = ($overs * 6) + $balls;
            $total_overs_completed = $total_balls_bowled / 6.0;
            $total_balls_limit = 120; // Default T20 limit
            $balls_remaining = max(0, $total_balls_limit - $total_balls_bowled);
            $wickets_in_hand = 10 - $wickets;

            $crr = $total_overs_completed > 0 ? ($runs / $total_overs_completed) : 0.0;
            $runs_remaining = $target ? max(0, $target - $runs) : 0;
            $rrr = ($target && $balls_remaining > 0) ? ($runs_remaining / ($balls_remaining / 6.0)) : 0.0;

            // Gather extra ML features from database
            // 1. Momentum (runs scored in last 12 balls)
            $momStmt = $db->prepare("SELECT SUM(runs) as sum_runs, SUM(is_wicket) as sum_wickets FROM (SELECT runs, is_wicket FROM balls WHERE innings_id = ? ORDER BY id DESC LIMIT 12) as temp");
            $momStmt->execute([$innings['id']]);
            $momData = $momStmt->fetch();
            $momentum = ($momData && $momData['sum_runs'] !== null) ? (float)$momData['sum_runs'] : 7.2;
            $wicket_momentum = ($momData && $momData['sum_wickets'] !== null) ? (float)$momData['sum_wickets'] : 0.0;

            // 2. Partnership runs
            $partStmt = $db->prepare("SELECT SUM(runs) FROM batting_stats WHERE innings_id = ? AND is_out = 0");
            $partStmt->execute([$innings['id']]);
            $partnership_runs = (float)$partStmt->fetchColumn();

            // 3. Current bowler economy
            $bowler_economy = 7.5;
            if ($innings['current_bowler_id']) {
                $bowlStmt = $db->prepare("SELECT overs, runs_conceded FROM bowling_stats WHERE innings_id = ? AND player_id = ?");
                $bowlStmt->execute([$innings['id'], $innings['current_bowler_id']]);
                $bowlData = $bowlStmt->fetch();
                if ($bowlData) {
                    $b_overs = (float)$bowlData['overs'];
                    $b_runs = (int)$bowlData['runs_conceded'];
                    $b_balls = (floor($b_overs) * 6) + (($b_overs - floor($b_overs)) * 10);
                    if ($b_balls > 0) {
                        $bowler_economy = ($b_runs / $b_balls) * 6.0;
                    }
                }
            }

            $pressure_index = $rrr > 0 ? ($rrr * (1.0 + (10 - $wickets_in_hand) * 0.1)) : 0.0;
            $resource_remaining = ($balls_remaining / 120.0) * ($wickets_in_hand / 10.0) * 100.0;

            $features = [
                'score' => (float)$runs,
                'wickets_lost' => (float)$wickets,
                'overs_completed' => (float)($overs + ($balls / 6.0)),
                'balls_remaining' => (float)$balls_remaining,
                'runs_remaining' => (float)$runs_remaining,
                'current_run_rate' => (float)$crr,
                'required_run_rate' => (float)$rrr,
                'wickets_in_hand' => (float)$wickets_in_hand,
                'pressure_index' => (float)$pressure_index,
                'resource_remaining' => (float)$resource_remaining,
                'momentum' => (float)$momentum,
                'wicket_momentum' => (float)$wicket_momentum,
                'partnership_runs' => (float)$partnership_runs,
                'current_bowler_economy' => (float)$bowler_economy
            ];

            // Try to fetch prediction from FastAPI ML service on Render
            $ml_service_url = defined('ML_SERVICE_URL') ? ML_SERVICE_URL : 'https://champion-sports-ml.onrender.com';
            $ml_url = rtrim($ml_service_url, '/') . '/predict';
            $ch = curl_init($ml_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($features));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT_MS, 300); // short timeout to fail fast
            $ml_res = curl_exec($ch);
            $ml_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $prob_batting = null;
            if ($ml_status === 200 && $ml_res) {
                $ml_data = json_decode($ml_res, true);
                if (isset($ml_data['win_probability']) && $ml_data['source'] === 'ml_model') {
                    $prob_batting = (float)$ml_data['win_probability'];
                }
            }

            // Fallback to manual weighted logic if ML not loaded or service offline
            if ($prob_batting === null) {
                if (empty($target)) {
                    // First Innings
                    // W_crr scales smoothly from 0.0 (first ball) to 0.8 (after 6 overs/36 balls completed)
                    $w_crr = min(0.80, $total_balls_bowled / 36.0);
                    $proj_rr = ($w_crr * $crr) + ((1.0 - $w_crr) * 8.25);
                    $proj_score = $runs + (($balls_remaining / 6.0) * $proj_rr);
                    
                    // Parabolic wicket penalty reflecting high pressure as batting team runs out of wickets
                    $wkt_ratio = $wickets / 10.0;
                    $wkt_penalty = ($wkt_ratio * $wkt_ratio * 0.25) + ($wkt_ratio * 0.15);
                    
                    $prob_batting = 0.5 + (($proj_score - 165) / 150.0) - $wkt_penalty;
                    $prob_batting = max(0.05, min(0.95, $prob_batting));
                } else {
                    // Second Innings (Chasing)
                    if ($balls_remaining <= 0) {
                        $prob_batting = $runs >= $target ? 0.99 : 0.01;
                    } else {
                        // Base target-based starting baseline (Target 165 -> 50-50, Target 215 -> 8.3%, Bounded)
                        $prob_base = 0.5 - (($target - 165) / 120.0);
                        $prob_base = max(0.05, min(0.95, $prob_base));
                        
                        // Live match progress weight
                        $w_live = (120.0 - $balls_remaining) / 120.0;
                        
                        // Live situational calculation
                        $diff = $crr - $rrr;
                        
                        // Small data vs Large data weights on run rate difference
                        if ($total_balls_bowled < 24) {
                            $w_diff = 0.03;
                        } else {
                            $w_diff = 0.06;
                        }
                        
                        // Wickets factor (compares remaining wickets relative to remaining balls ratio)
                        $wkt_factor = ($wickets_in_hand / 10.0) - ($balls_remaining / 120.0);
                        
                        $prob_situation = 0.5 + ($diff * $w_diff) + ($wkt_factor * 0.20);
                        
                        // Blend target starting probability with the active live situation as match progresses
                        $prob_batting = ((1.0 - $w_live) * $prob_base) + ($w_live * $prob_situation);
                        $prob_batting = max(0.01, min(0.99, $prob_batting));
                    }
                }
            }

            // Map batting team probability back to team A/B
            if ((int)$battingTeamId === (int)$teamAId) {
                $probA = $prob_batting;
                $probB = 1.0 - $probA;
            } else {
                $probB = $prob_batting;
                $probA = 1.0 - $probB;
            }
        } else {
            // Default pre-match logic if status is LIVE but no innings started yet
            $status = 'SCHEDULED';
        }
    }

    if ($status === 'SCHEDULED') {
        // Pre-match / Scheduled: calculate odds based on previous historical match wins
        $stmtA = $db->prepare("SELECT COUNT(*) FROM matches WHERE winner_id = ? AND status = 'COMPLETED'");
        $stmtA->execute([$teamAId]);
        $winsA = (int)$stmtA->fetchColumn();

        $stmtB = $db->prepare("SELECT COUNT(*) FROM matches WHERE winner_id = ? AND status = 'COMPLETED'");
        $stmtB->execute([$teamBId]);
        $winsB = (int)$stmtB->fetchColumn();

        $total = $winsA + $winsB;
        if ($total > 0) {
            // Small data weight vs Large data weight for historical matches
            if ($total < 5) {
                // Small data: give 65% weight to default 50-50, 35% weight to actual win record
                $w_hist = 0.35;
            } else {
                // Large data: give 75% weight to actual win record
                $w_hist = 0.75;
            }
            $win_ratio_a = ($winsA + 1) / ($total + 2); // Laplace smoothing
            $probA = ($w_hist * $win_ratio_a) + ((1.0 - $w_hist) * 0.5);
            $probB = 1.0 - $probA;
        } else {
            // Perfectly new match with absolutely no data
            $probA = 0.5;
            $probB = 0.5;
        }
    }

    // Convert probabilities to decimal odds incorporating a 5% bookmaker margin
    $oddsA = round(max(1.01, min(100.0, 0.95 / $probA)), 2);
    $oddsB = round(max(1.01, min(100.0, 0.95 / $probB)), 2);

    // Save/update match_odds table
    $stmt = $db->prepare("SELECT id FROM match_odds WHERE match_id = ?");
    $stmt->execute([$matchId]);
    $exists = $stmt->fetch();
    if ($exists) {
        $db->prepare("UPDATE match_odds SET team_a_odds = ?, team_b_odds = ?, draw_odds = 4.00, bookmaker_odds = ? WHERE match_id = ?")
           ->execute([$oddsA, $oddsB, $oddsA, $matchId]);
    } else {
        $db->prepare("INSERT INTO match_odds (match_id, team_a_odds, team_b_odds, draw_odds, bookmaker_odds) VALUES (?, ?, ?, 4.00, ?)")
           ->execute([$matchId, $oddsA, $oddsB, $oddsA]);
    }

    // Return the calculated odds
    $stmt = $db->prepare("SELECT * FROM match_odds WHERE match_id = ?");
    $stmt->execute([$matchId]);
    $odds = $stmt->fetch();
    jsonResponse(formatOdds($odds));
} elseif ($method === 'POST' || $method === 'PUT') {
    $d = getInput();
    
    // Check if odds exist
    $stmt = $db->prepare("SELECT id FROM match_odds WHERE match_id = ?");
    $stmt->execute([$matchId]);
    $exists = $stmt->fetch();
    
    $teamA = (float)($d['teamAOdds'] ?? 1.90);
    $teamB = (float)($d['teamBOdds'] ?? 1.90);
    $draw  = (float)($d['drawOdds']  ?? 4.00);
    $book  = (float)($d['bookmakerOdds'] ?? 1.90);
    
    if ($exists) {
        $db->prepare("UPDATE match_odds SET team_a_odds = ?, team_b_odds = ?, draw_odds = ?, bookmaker_odds = ? WHERE match_id = ?")
           ->execute([$teamA, $teamB, $draw, $book, $matchId]);
    } else {
        $db->prepare("INSERT INTO match_odds (match_id, team_a_odds, team_b_odds, draw_odds, bookmaker_odds) VALUES (?, ?, ?, ?, ?)")
           ->execute([$matchId, $teamA, $teamB, $draw, $book]);
    }
    
    $stmt = $db->prepare("SELECT * FROM match_odds WHERE match_id = ?");
    $stmt->execute([$matchId]);
    jsonResponse(formatOdds($stmt->fetch()));
} else {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

function formatOdds(array $r): array {
    return [
        'id'            => (int)$r['id'],
        'matchId'       => (int)$r['match_id'],
        'teamAOdds'     => (float)$r['team_a_odds'],
        'teamBOdds'     => (float)$r['team_b_odds'],
        'drawOdds'      => (float)$r['draw_odds'],
        'bookmakerOdds' => (float)$r['bookmaker_odds'],
        'updatedAt'     => $r['updated_at']
    ];
}
