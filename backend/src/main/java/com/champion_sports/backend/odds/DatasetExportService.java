package com.champion_sports.backend.odds;

import org.springframework.stereotype.Service;
import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.teams.Team;

import java.util.ArrayList;
import java.util.List;

@Service
public class DatasetExportService {

    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;
    private final BallRepository ballRepository;

    public DatasetExportService(
            MatchRepository matchRepository,
            InningsRepository inningsRepository,
            BallRepository ballRepository
    ) {
        this.matchRepository = matchRepository;
        this.inningsRepository = inningsRepository;
        this.ballRepository = ballRepository;
    }

    public String exportToCsv() {
        StringBuilder csv = new StringBuilder();
        // CSV Headers matching features expected by ML model training pipeline
        csv.append("score,wickets_lost,overs_completed,balls_remaining,runs_remaining,current_run_rate,")
           .append("required_run_rate,wickets_in_hand,pressure_index,resource_remaining,momentum,")
           .append("wicket_momentum,partnership_runs,current_bowler_economy,match_result\n");

        List<Match> completedMatches = matchRepository.findByStatus(MatchStatus.COMPLETED);

        for (Match match : completedMatches) {
            if (match.getWinner() == null) {
                // Skip matches with no result / ties that have no winner
                continue;
            }
            
            List<Innings> inningsList = inningsRepository.findByMatch(match);
            if (inningsList.size() < 2) {
                // Must have both innings to train a proper model
                continue;
            }
            
            // Sort by inningsNumber
            inningsList.sort((a, b) -> Integer.compare(a.getInningsNumber(), b.getInningsNumber()));
            
            int firstInningsRuns = inningsList.get(0).getRuns();
            
            for (Innings innings : inningsList) {
                Team battingTeam = innings.getBattingTeam();
                // match_result = 1 if the batting team wins the match, 0 otherwise
                int matchResult = match.getWinner().getId().equals(battingTeam.getId()) ? 1 : 0;
                
                List<Ball> balls = ballRepository.findByInningsOrderByOverNumberAscBallNumberAsc(innings);
                
                int runningScore = 0;
                int runningWickets = 0;
                int totalOvers = match.getOversLimit() != null ? match.getOversLimit() : 20;
                int totalBalls = totalOvers * 6;
                
                // Track partnership and bowler states ball-by-ball
                int partnershipRuns = 0;
                
                // Track bowler stats dynamically in this loop
                // Key bowler performance maps
                java.util.Map<Long, Integer> bowlerRunsMap = new java.util.HashMap<>();
                java.util.Map<Long, Integer> bowlerBallsMap = new java.util.HashMap<>();
                
                for (int idx = 0; idx < balls.size(); idx++) {
                    Ball ball = balls.get(idx);
                    
                    // Update running stats before calculating features at this ball state
                    int ballRuns = ball.getRuns() != null ? ball.getRuns() : 0;
                    runningScore += ballRuns;
                    
                    if (Boolean.TRUE.equals(ball.getWicket())) {
                        runningWickets++;
                        partnershipRuns = 0; // reset partnership
                    } else {
                        partnershipRuns += ballRuns;
                    }
                    
                    // Update bowler stats
                    if (ball.getBowler() != null) {
                        Long bowlerId = ball.getBowler().getId();
                        bowlerRunsMap.put(bowlerId, bowlerRunsMap.getOrDefault(bowlerId, 0) + ballRuns);
                        if (Boolean.FALSE.equals(ball.getWide()) && Boolean.FALSE.equals(ball.getNoBall())) {
                            bowlerBallsMap.put(bowlerId, bowlerBallsMap.getOrDefault(bowlerId, 0) + 1);
                        }
                    }
                    
                    double oversCompleted = ball.getOverNumber() + (ball.getBallNumber() / 6.0);
                    int ballsRemaining = Math.max(0, totalBalls - (ball.getOverNumber() * 6 + ball.getBallNumber()));
                    int wicketsInHand = 10 - runningWickets;
                    
                    double currentRunRate = 0.0;
                    if (oversCompleted > 0) {
                        currentRunRate = (runningScore / oversCompleted);
                    } else {
                        currentRunRate = 7.5;
                    }
                    
                    double runsRemaining = 0.0;
                    double requiredRunRate = 0.0;
                    
                    if (innings.getInningsNumber() == 2) {
                        runsRemaining = Math.max(0.0, (firstInningsRuns + 1.0) - runningScore);
                        if (ballsRemaining > 0) {
                            requiredRunRate = (runsRemaining / ballsRemaining) * 6.0;
                        } else {
                            requiredRunRate = runsRemaining > 0 ? 99.0 : 0.0;
                        }
                    }
                    
                    // Momentum: last 18 balls runs and wickets
                    int momentumRuns = 0;
                    int momentumWickets = 0;
                    int startIdx = Math.max(0, idx - 17);
                    for (int k = startIdx; k <= idx; k++) {
                        Ball b = balls.get(k);
                        momentumRuns += b.getRuns() != null ? b.getRuns() : 0;
                        if (Boolean.TRUE.equals(b.getWicket())) {
                            momentumWickets++;
                        }
                    }
                    
                    // Current Bowler Economy
                    double currentBowlerEconomy = 7.5;
                    if (ball.getBowler() != null) {
                        Long bowlerId = ball.getBowler().getId();
                        int bowlerRuns = bowlerRunsMap.getOrDefault(bowlerId, 0);
                        int bowlerBalls = bowlerBallsMap.getOrDefault(bowlerId, 0);
                        if (bowlerBalls > 0) {
                            currentBowlerEconomy = (bowlerRuns / (double) bowlerBalls) * 6.0;
                        }
                    }
                    
                    double pressureIndex = requiredRunRate - currentRunRate;
                    double resourceRemaining = wicketsInHand * ballsRemaining;
                    
                    // Output features line
                    csv.append(runningScore).append(",")
                       .append(runningWickets).append(",")
                       .append(String.format("%.2f", oversCompleted)).append(",")
                       .append(ballsRemaining).append(",")
                       .append(String.format("%.2f", runsRemaining)).append(",")
                       .append(String.format("%.2f", currentRunRate)).append(",")
                       .append(String.format("%.2f", requiredRunRate)).append(",")
                       .append(wicketsInHand).append(",")
                       .append(String.format("%.2f", pressureIndex)).append(",")
                       .append(String.format("%.2f", resourceRemaining)).append(",")
                       .append(momentumRuns).append(",")
                       .append(momentumWickets).append(",")
                       .append(partnershipRuns).append(",")
                       .append(String.format("%.2f", currentBowlerEconomy)).append(",")
                       .append(matchResult).append("\n");
                }
            }
        }
        return csv.toString();
    }
}
