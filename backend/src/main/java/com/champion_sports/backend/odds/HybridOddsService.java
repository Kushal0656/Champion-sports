package com.champion_sports.backend.odds;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.tournaments.PointsTable;
import com.champion_sports.backend.tournaments.PointsTableRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class HybridOddsService {

    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;
    private final BallRepository ballRepository;
    private final PointsTableRepository pointsTableRepository;
    private final MatchOddsRepository matchOddsRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${ml.service.url:http://localhost:8000}")
    private String mlServiceUrl;

    public HybridOddsService(
            MatchRepository matchRepository,
            InningsRepository inningsRepository,
            BallRepository ballRepository,
            PointsTableRepository pointsTableRepository,
            MatchOddsRepository matchOddsRepository,
            ObjectMapper objectMapper
    ) {
        this.matchRepository = matchRepository;
        this.inningsRepository = inningsRepository;
        this.ballRepository = ballRepository;
        this.pointsTableRepository = pointsTableRepository;
        this.matchOddsRepository = matchOddsRepository;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(150))
                .build();
    }

    public LiveOddsResponse getLiveOdds(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        List<Innings> inningsList = inningsRepository.findByMatch(match);
        if (inningsList.isEmpty()) {
            // Scheduled Match - calculate based on standings
            return calculateStandingsBaseline(match);
        }

        // Sort innings by inningsNumber
        inningsList.sort((a, b) -> Integer.compare(a.getInningsNumber(), b.getInningsNumber()));
        
        Innings currentInnings = inningsList.get(inningsList.size() - 1);
        Team battingTeam = currentInnings.getBattingTeam();
        Team bowlingTeam = currentInnings.getBowlingTeam();
        
        int score = currentInnings.getRuns() != null ? currentInnings.getRuns() : 0;
        int wicketsLost = currentInnings.getWickets() != null ? currentInnings.getWickets() : 0;
        double oversCompleted = (currentInnings.getOvers() != null ? currentInnings.getOvers() : 0) 
                + ((currentInnings.getBalls() != null ? currentInnings.getBalls() : 0) / 6.0);
        int totalOvers = match.getOversLimit() != null ? match.getOversLimit() : 20;
        int totalBalls = totalOvers * 6;
        int ballsRemaining = Math.max(0, totalBalls - ((currentInnings.getOvers() != null ? currentInnings.getOvers() : 0) * 6 
                + (currentInnings.getBalls() != null ? currentInnings.getBalls() : 0)));
        int wicketsInHand = 10 - wicketsLost;
        
        double currentRunRate = oversCompleted > 0 ? (score / oversCompleted) : 7.5;
        
        double target = 0.0;
        double runsRemaining = 0.0;
        double requiredRunRate = 0.0;
        
        if (inningsList.size() >= 2) {
            target = inningsList.get(0).getRuns() + 1.0;
            runsRemaining = Math.max(0.0, target - score);
            if (ballsRemaining > 0) {
                requiredRunRate = (runsRemaining / ballsRemaining) * 6.0;
            } else {
                requiredRunRate = runsRemaining > 0 ? 99.0 : 0.0;
            }
        }
        
        // Fetch ball-by-ball details for advanced features
        List<Ball> balls = ballRepository.findByInningsOrderByOverNumberAscBallNumberAsc(currentInnings);
        int ballsCount = balls.size();
        
        // 1. Calculate momentum (runs scored in last 18 balls)
        int momentum = 0;
        for (int i = Math.max(0, ballsCount - 18); i < ballsCount; i++) {
            Integer r = balls.get(i).getRuns();
            if (r != null) {
                momentum += r;
            }
        }
        
        // 2. Calculate wicket momentum (wickets lost in last 18 balls)
        int wicketMomentum = 0;
        for (int i = Math.max(0, ballsCount - 18); i < ballsCount; i++) {
            if (Boolean.TRUE.equals(balls.get(i).getWicket())) {
                wicketMomentum++;
            }
        }
        
        // 3. Calculate partnership runs
        int partnershipRuns = 0;
        for (int i = ballsCount - 1; i >= 0; i--) {
            Ball b = balls.get(i);
            if (Boolean.TRUE.equals(b.getWicket())) {
                break;
            }
            Integer r = b.getRuns();
            if (r != null) {
                partnershipRuns += r;
            }
        }
        
        // 4. Calculate current bowler economy
        double bowlerEconomy = 7.5;
        if (currentInnings.getCurrentBowler() != null && !balls.isEmpty()) {
            Long bowlerId = currentInnings.getCurrentBowler().getId();
            int bowlerRunsConceded = 0;
            int bowlerValidBalls = 0;
            for (Ball b : balls) {
                if (b.getBowler() != null && b.getBowler().getId().equals(bowlerId)) {
                    Integer r = b.getRuns();
                    if (r != null) {
                        bowlerRunsConceded += r;
                    }
                    if (Boolean.FALSE.equals(b.getWide()) && Boolean.FALSE.equals(b.getNoBall())) {
                        bowlerValidBalls++;
                    }
                }
            }
            if (bowlerValidBalls > 0) {
                bowlerEconomy = (bowlerRunsConceded / (double) bowlerValidBalls) * 6.0;
            }
        }
        
        double pressureIndex = requiredRunRate - currentRunRate;
        double resourceRemaining = wicketsInHand * ballsRemaining;
        
        // Calculate Rule-Based probability
        double ruleProbability = 50.0;
        ruleProbability += (wicketsInHand * 2.0);
        ruleProbability -= (pressureIndex * 3.0);
        ruleProbability += (momentum * 0.3);
        ruleProbability -= (wicketMomentum * 5.0);
        ruleProbability += (partnershipRuns * 0.05);
        
        if (bowlerEconomy < 7.0) {
            ruleProbability -= 3.0;
        } else if (bowlerEconomy > 10.0) {
            ruleProbability += 3.0;
        }
        
        // Clamp rule probability
        ruleProbability = Math.max(1.0, Math.min(99.0, ruleProbability));
        
        // Now try to fetch prediction from FastAPI ML service
        Double mlProb = null;
        Double mlConfidence = null;
        String source = "rule_engine";
        
        try {
            Map<String, Object> featureMap = new HashMap<>();
            featureMap.put("score", (double) score);
            featureMap.put("wickets_lost", (double) wicketsLost);
            featureMap.put("overs_completed", oversCompleted);
            featureMap.put("balls_remaining", (double) ballsRemaining);
            featureMap.put("runs_remaining", runsRemaining);
            featureMap.put("current_run_rate", currentRunRate);
            featureMap.put("required_run_rate", requiredRunRate);
            featureMap.put("wickets_in_hand", (double) wicketsInHand);
            featureMap.put("pressure_index", pressureIndex);
            featureMap.put("resource_remaining", resourceRemaining);
            featureMap.put("momentum", (double) momentum);
            featureMap.put("wicket_momentum", (double) wicketMomentum);
            featureMap.put("partnership_runs", (double) partnershipRuns);
            featureMap.put("current_bowler_economy", bowlerEconomy);
            
            String jsonPayload = objectMapper.writeValueAsString(featureMap);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mlServiceUrl + "/predict"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .timeout(Duration.ofMillis(200)) // ensure low latency response (<50ms desired)
                    .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JsonNode jsonNode = objectMapper.readTree(response.body());
                mlProb = jsonNode.get("win_probability").asDouble() * 100.0; // scale from [0, 1] to [0, 100]
                mlConfidence = jsonNode.get("confidence").asDouble(); // [0, 1] confidence
            }
        } catch (Exception e) {
            // ML microservice offline or failed, fallback to 100% rule engine
            System.err.println("Failed to call ML prediction service, falling back to rule engine: " + e.getMessage());
        }
        
        double finalProbability = ruleProbability;
        double confidence = 0.50; // baseline confidence for rule engine
        
        if (mlProb != null && mlConfidence != null) {
            // Confidence logic: if ML confidence < 55% (0.55), fallback to rule engine
            if (mlConfidence < 0.55) {
                finalProbability = ruleProbability;
                source = "rule_engine";
                confidence = mlConfidence;
            } else {
                // Determine blending based on completed matches count
                long completedMatchesCount = matchRepository.countByStatus(MatchStatus.COMPLETED);
                double ruleWeight = 0.9;
                double mlWeight = 0.1;
                
                if (completedMatchesCount < 10) {
                    ruleWeight = 0.9;
                    mlWeight = 0.1;
                } else if (completedMatchesCount <= 50) {
                    ruleWeight = 0.5;
                    mlWeight = 0.5;
                } else {
                    ruleWeight = 0.2;
                    mlWeight = 0.8;
                }
                
                finalProbability = (ruleWeight * ruleProbability) + (mlWeight * mlProb);
                source = "hybrid_model";
                confidence = mlConfidence;
            }
        }
        
        // Clamp final probability between 1.0% and 99.0%
        finalProbability = Math.max(1.0, Math.min(99.0, finalProbability));
        
        double opponentProbability = 100.0 - finalProbability;
        
        // Decimal Odds calculation: odds = 1 / P
        double battingOdds = 100.0 / finalProbability;
        double bowlingOdds = 100.0 / opponentProbability;
        
        // Save the calculated odds back to the database for this match
        saveMatchOddsToDb(matchId, match, battingTeam, battingOdds, bowlingOdds);
        
        return new LiveOddsResponse(
                finalProbability,
                opponentProbability,
                battingOdds,
                bowlingOdds,
                confidence,
                source,
                battingTeam.getName(),
                bowlingTeam.getName()
        );
    }
    
    private void saveMatchOddsToDb(Long matchId, Match match, Team battingTeam, double battingOdds, double bowlingOdds) {
        try {
            MatchOdds odds = matchOddsRepository.findByMatchId(matchId).orElse(new MatchOdds());
            odds.setMatchId(matchId);
            
            double teamAOdds;
            double teamBOdds;
            if (battingTeam.getId().equals(match.getTeamA().getId())) {
                teamAOdds = battingOdds;
                teamBOdds = bowlingOdds;
            } else {
                teamAOdds = bowlingOdds;
                teamBOdds = battingOdds;
            }
            
            odds.setTeamAOdds(Math.round(teamAOdds * 100.0) / 100.0);
            odds.setTeamBOdds(Math.round(teamBOdds * 100.0) / 100.0);
            odds.setDrawOdds(4.00);
            odds.setBookmakerOdds(odds.getTeamAOdds());
            odds.setUpdatedAt(LocalDateTime.now());
            
            matchOddsRepository.save(odds);
        } catch (Exception e) {
            System.err.println("Could not save calculated match odds to DB: " + e.getMessage());
        }
    }

    private LiveOddsResponse calculateStandingsBaseline(Match match) {
        double probA = 0.5;
        if (match.getTournament() != null) {
            Optional<PointsTable> entryAOpt = pointsTableRepository.findByTournamentAndTeam(match.getTournament(), match.getTeamA());
            Optional<PointsTable> entryBOpt = pointsTableRepository.findByTournamentAndTeam(match.getTournament(), match.getTeamB());
            
            if (entryAOpt.isPresent() && entryBOpt.isPresent()) {
                PointsTable entryA = entryAOpt.get();
                PointsTable entryB = entryBOpt.get();
                
                double strengthA = entryA.getPoints() + (entryA.getNetRunRate() * 2.0);
                double strengthB = entryB.getPoints() + (entryB.getNetRunRate() * 2.0);
                
                probA = 0.5 + (strengthA - strengthB) * 0.04;
            }
        }
        probA = Math.max(0.1, Math.min(0.9, probA));
        double probB = 1.0 - probA;
        
        double teamAOdds = 1.0 / probA;
        double teamBOdds = 1.0 / probB;
        
        // Save standings-based baseline odds to DB
        saveMatchOddsToDb(match.getId(), match, match.getTeamA(), teamAOdds, teamBOdds);
        
        return new LiveOddsResponse(
                probA * 100.0,
                probB * 100.0,
                teamAOdds,
                teamBOdds,
                0.50,
                "standings_baseline",
                match.getTeamA() != null ? match.getTeamA().getName() : "Team A",
                match.getTeamB() != null ? match.getTeamB().getName() : "Team B"
        );
    }
}
