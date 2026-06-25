package com.champion_sports.backend.developer;

import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;

import com.champion_sports.backend.auth.DeveloperKey;
import com.champion_sports.backend.auth.DeveloperKeyRepository;
import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.tournaments.Tournament;
import com.champion_sports.backend.tournaments.TournamentRepository;
import com.champion_sports.backend.odds.MatchOdds;
import com.champion_sports.backend.odds.MatchOddsRepository;
import com.champion_sports.backend.sessions.CricketSession;
import com.champion_sports.backend.sessions.CricketSessionRepository;
import com.champion_sports.backend.scores.ScoringService;
import com.champion_sports.backend.scores.ScorecardStateDTO;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.scores.ScorecardBattingEntryDTO;
import com.champion_sports.backend.scores.ScorecardBowlingEntryDTO;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@CrossOrigin(origins = "*")
public class DeveloperApiController {

    private final DeveloperKeyRepository developerKeyRepository;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;
    private final MatchOddsRepository matchOddsRepository;
    private final CricketSessionRepository cricketSessionRepository;
    private final ScoringService scoringService;

    @Autowired
    public DeveloperApiController(
            DeveloperKeyRepository developerKeyRepository,
            MatchRepository matchRepository,
            TournamentRepository tournamentRepository,
            MatchOddsRepository matchOddsRepository,
            CricketSessionRepository cricketSessionRepository,
            @Lazy ScoringService scoringService
    ) {
        this.developerKeyRepository = developerKeyRepository;
        this.matchRepository = matchRepository;
        this.tournamentRepository = tournamentRepository;
        this.matchOddsRepository = matchOddsRepository;
        this.cricketSessionRepository = cricketSessionRepository;
        this.scoringService = scoringService;
    }

    private DeveloperKey getAuthorizedKey(HttpServletRequest request, String clientId, String token) {
        String finalClientId = clientId;
        String finalToken = token;

        if (finalClientId == null || finalClientId.isEmpty()) {
            finalClientId = request.getHeader("X-Client-Id");
        }
        if (finalToken == null || finalToken.isEmpty()) {
            finalToken = request.getHeader("X-Token");
            if (finalToken == null || finalToken.isEmpty()) {
                finalToken = request.getHeader("X-API-Key");
            }
        }

        if (finalClientId == null || finalToken == null || finalClientId.isEmpty() || finalToken.isEmpty()) {
            return null;
        }

        final String lookupClientId = finalClientId;
        final String lookupToken = finalToken;

        return developerKeyRepository.findByClientId(lookupClientId)
                .filter(key -> key.isActive() && key.getToken().equals(lookupToken))
                .orElse(null);
    }

    private boolean hasPermission(DeveloperKey key, String apiName) {
        if (key == null) return false;
        if (key.getAllowedApis() == null || key.getAllowedApis().isEmpty()) return false;
        return Arrays.asList(key.getAllowedApis().split(",")).contains(apiName);
    }

    private ResponseEntity<?> unauthorizedResponse() {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", "Unauthorized: Invalid or missing clientId and token");
        error.put("code", HttpStatus.UNAUTHORIZED.value());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    private ResponseEntity<?> forbiddenResponse(String apiName) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", "Forbidden: This key does not have access to the " + apiName + " API");
        error.put("code", HttpStatus.FORBIDDEN.value());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    private Long resolveEventId(Long pathId, Long eventId, Long event_id, Long matchId, Long id) {
        if (pathId != null) return pathId;
        if (eventId != null) return eventId;
        if (event_id != null) return event_id;
        if (matchId != null) return matchId;
        return id;
    }

    // 1. List Matches
    @GetMapping({"/api/v1/get/events/{sportId}", "/api/v1/get/events"})
    public ResponseEntity<?> getEvents(
            HttpServletRequest request,
            @PathVariable(required = false) String sportId,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "EVENTS")) {
            return forbiddenResponse("Matches (EVENTS)");
        }
        List<Match> matches = matchRepository.findAll();
        List<Map<String, Object>> formattedEvents = new ArrayList<>();
        for (Match match : matches) {
            Map<String, Object> event = new HashMap<>();
            event.put("id", match.getId());
            event.put("venue", match.getVenue());
            event.put("matchDate", match.getMatchDate() != null ? match.getMatchDate().toString() : "");
            event.put("status", match.getStatus() != null ? match.getStatus().name() : "SCHEDULED");
            event.put("currentInnings", match.getCurrentInnings() != null ? match.getCurrentInnings() : 1);
            event.put("tossDecision", match.getTossDecision() != null ? match.getTossDecision() : "");
            event.put("resultMargin", match.getResultMargin() != null ? match.getResultMargin() : "");
            event.put("streamUrl", match.getStreamUrl() != null ? match.getStreamUrl() : "");
            
            // Format teamA
            if (match.getTeamA() != null) {
                Map<String, Object> teamA = new HashMap<>();
                teamA.put("id", match.getTeamA().getId());
                teamA.put("name", match.getTeamA().getName());
                teamA.put("shortName", match.getTeamA().getShortName());
                event.put("teamA", teamA);
            } else {
                event.put("teamA", null);
            }
            
            // Format teamB
            if (match.getTeamB() != null) {
                Map<String, Object> teamB = new HashMap<>();
                teamB.put("id", match.getTeamB().getId());
                teamB.put("name", match.getTeamB().getName());
                teamB.put("shortName", match.getTeamB().getShortName());
                event.put("teamB", teamB);
            } else {
                event.put("teamB", null);
            }
            
            // Format tossWinner
            if (match.getTossWinnerId() != null) {
                Map<String, Object> tossWinner = new HashMap<>();
                tossWinner.put("id", match.getTossWinnerId());
                if (match.getTeamA() != null && match.getTossWinnerId().equals(match.getTeamA().getId())) {
                    tossWinner.put("name", match.getTeamA().getName());
                } else if (match.getTeamB() != null && match.getTossWinnerId().equals(match.getTeamB().getId())) {
                    tossWinner.put("name", match.getTeamB().getName());
                } else {
                    tossWinner.put("name", "Toss Winner");
                }
                event.put("tossWinner", tossWinner);
            } else {
                event.put("tossWinner", null);
            }
            
            // Format winner
            if (match.getWinner() != null) {
                Map<String, Object> winner = new HashMap<>();
                winner.put("id", match.getWinner().getId());
                winner.put("name", match.getWinner().getName());
                event.put("winner", winner);
            } else {
                event.put("winner", null);
            }
            
            formattedEvents.add(event);
        }
        return ResponseEntity.ok(formattedEvents);
    }

    // 1.1 List Series
    @GetMapping({"/api/v1/get/series/{sportId}", "/api/v1/get/series"})
    public ResponseEntity<?> getSeries(
            HttpServletRequest request,
            @PathVariable(required = false) String sportId,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "SERIES")) {
            return forbiddenResponse("Series (SERIES)");
        }
        List<Tournament> tournaments = tournamentRepository.findAll();
        return ResponseEntity.ok(tournaments);
    }

    // 2 & 4. Get Bookmaker Market / Bookmaker Odds
    @GetMapping({"/api/v1/get/bookmaker/{eventId}", "/api/v1/get/bookmaker"})
    public ResponseEntity<?> getBookmaker(
            HttpServletRequest request,
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "BOOKMAKER")) {
            return forbiddenResponse("Bookmaker Odds (BOOKMAKER)");
        }
        Long targetMatchId = resolveEventId(eventId, null, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId or id parameter is required"));
        }

        MatchOdds odds = matchOddsRepository.findByMatchId(targetMatchId)
                .orElseGet(() -> {
                    MatchOdds newOdds = new MatchOdds(targetMatchId, 1.90, 1.90, 4.00, 1.90);
                    return matchOddsRepository.save(newOdds);
                });
        return ResponseEntity.ok(odds);
    }

    // 3. Get Match Odds
    @GetMapping({"/api/v1/get/odds/{eventId}", "/api/v1/get/odds"})
    public ResponseEntity<?> getOdds(
            HttpServletRequest request,
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "ODDS")) {
            return forbiddenResponse("Match Odds (ODDS)");
        }
        Long targetMatchId = resolveEventId(eventId, null, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId or id parameter is required"));
        }

        MatchOdds odds = matchOddsRepository.findByMatchId(targetMatchId)
                .orElseGet(() -> {
                    MatchOdds newOdds = new MatchOdds(targetMatchId, 1.90, 1.90, 4.00, 1.90);
                    return matchOddsRepository.save(newOdds);
                });
        return ResponseEntity.ok(odds);
    }

    // 5. Get Sessions (Cricket Only)
    @GetMapping({"/api/v1/get/sessions/{eventId}", "/api/v1/get/sessions"})
    public ResponseEntity<?> getSessions(
            HttpServletRequest request,
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "SESSIONS")) {
            return forbiddenResponse("Sessions (SESSIONS)");
        }
        Long targetMatchId = resolveEventId(eventId, null, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId or id parameter is required"));
        }

        List<CricketSession> sessions = cricketSessionRepository.findByMatchId(targetMatchId);
        if (sessions.isEmpty()) {
            CricketSession s1 = new CricketSession(targetMatchId, "6 Over Runs Market", 48, 1.85, 1.85);
            CricketSession s2 = new CricketSession(targetMatchId, "10 Over Runs Market", 82, 1.90, 1.90);
            cricketSessionRepository.save(s1);
            cricketSessionRepository.save(s2);
            sessions = Arrays.asList(s1, s2);
        }
        return ResponseEntity.ok(sessions);
    }

    // 6. Session Result API
    @GetMapping({"/api/v1/result/session_result.php", "/api/v1/result/session_result"})
    public ResponseEntity<?> getSessionResult(
            HttpServletRequest request,
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "SESSION_RESULT")) {
            return forbiddenResponse("Session Result (SESSION_RESULT)");
        }
        Long targetMatchId = resolveEventId(null, eventId, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId query parameter is required"));
        }
        List<CricketSession> sessions = cricketSessionRepository.findByMatchId(targetMatchId);
        List<Map<String, Object>> declaredResults = new ArrayList<>();
        for (CricketSession s : sessions) {
            if ("DECLARED".equalsIgnoreCase(s.getStatus())) {
                Map<String, Object> res = new HashMap<>();
                res.put("id", s.getId());
                res.put("sessionName", s.getSessionName());
                res.put("runLine", s.getRunLine());
                res.put("resultRuns", s.getResult());
                res.put("status", s.getStatus());
                declaredResults.add(res);
            }
        }
        return ResponseEntity.ok(declaredResults);
    }

    // 7. Live TV API
    @GetMapping({"/tv.php", "/api/v1/get/tv"})
    public ResponseEntity<?> getTv(
            HttpServletRequest request,
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String marketId
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "TV")) {
            return forbiddenResponse("Live TV (TV)");
        }
        Long targetMatchId = resolveEventId(null, eventId, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId query parameter is required"));
        }

        Optional<Match> matchOpt = matchRepository.findById(targetMatchId);
        if (matchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Match match = matchOpt.get();

        Map<String, Object> tvDetails = new HashMap<>();
        tvDetails.put("eventId", targetMatchId);
        tvDetails.put("marketId", marketId != null ? marketId : "1.10098734");
        tvDetails.put("streamUrl", match.getStreamUrl() != null ? match.getStreamUrl() : "");
        tvDetails.put("status", match.getStatus() != null ? match.getStatus().name() : "SCHEDULED");
        tvDetails.put("title", match.getTeamA() != null ? (match.getTeamA().getName() + " vs " + match.getTeamB().getName()) : "Match Broadcast");

        return ResponseEntity.ok(tvDetails);
    }

    // 8. Score Card API
    @GetMapping({"/score.php", "/api/v1/get/score"})
    public ResponseEntity<?> getScore(
            HttpServletRequest request,
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "SCORE")) {
            return forbiddenResponse("Scorecard (SCORE)");
        }
        Long targetMatchId = resolveEventId(null, eventId, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId query parameter is required"));
        }

        Optional<Match> matchOpt = matchRepository.findById(targetMatchId);
        if (matchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Match match = matchOpt.get();
        ScorecardStateDTO scorecard = scoringService.getScorecardState(targetMatchId);

        Map<String, Object> scoreDetails = new HashMap<>();
        scoreDetails.put("eventId", targetMatchId);
        scoreDetails.put("status", match.getStatus() != null ? match.getStatus().name() : "SCHEDULED");
        scoreDetails.put("venue", match.getVenue());
        scoreDetails.put("matchDate", match.getMatchDate() != null ? match.getMatchDate().toString() : "");
        scoreDetails.put("teamA", match.getTeamA() != null ? match.getTeamA().getName() : "");
        scoreDetails.put("teamB", match.getTeamB() != null ? match.getTeamB().getName() : "");
        
        // Format toss details
        scoreDetails.put("tossWinner", "");
        if (match.getTossWinnerId() != null) {
            if (match.getTeamA() != null && match.getTossWinnerId().equals(match.getTeamA().getId())) {
                scoreDetails.put("tossWinner", match.getTeamA().getName());
            } else if (match.getTeamB() != null && match.getTossWinnerId().equals(match.getTeamB().getId())) {
                scoreDetails.put("tossWinner", match.getTeamB().getName());
            }
        }
        scoreDetails.put("tossDecision", match.getTossDecision() != null ? match.getTossDecision() : "");

        // Format scorecard.innings array exactly like the legacy PHP score.php API
        List<Map<String, Object>> inningsList = new ArrayList<>();

        if (scorecard.getInnings1() != null) {
            Map<String, Object> inn1Map = new HashMap<>();
            Innings inn1 = scorecard.getInnings1();
            inn1Map.put("inningsNumber", 1);
            inn1Map.put("runs", inn1.getRuns());
            inn1Map.put("wickets", inn1.getWickets());
            inn1Map.put("overs", inn1.getOvers());
            inn1Map.put("balls", inn1.getBalls());
            inn1Map.put("target", null);
            
            inn1Map.put("battingTeam", inn1.getBattingTeam() != null ? inn1.getBattingTeam().getName() : "");
            inn1Map.put("bowlingTeam", inn1.getBowlingTeam() != null ? inn1.getBowlingTeam().getName() : "");

            // Format batting stats
            List<Map<String, Object>> battingList = new ArrayList<>();
            if (scorecard.getTeam1BattingScorecard() != null) {
                for (ScorecardBattingEntryDTO entry : scorecard.getTeam1BattingScorecard()) {
                    Map<String, Object> bEntry = new HashMap<>();
                    bEntry.put("playerName", entry.getPlayerName());
                    bEntry.put("runs", entry.getStats().getRunsScored());
                    bEntry.put("balls", entry.getStats().getBallsFaced());
                    bEntry.put("fours", entry.getStats().getFours());
                    bEntry.put("sixes", entry.getStats().getSixes());
                    bEntry.put("isOut", entry.getStats().isDismissed());
                    battingList.add(bEntry);
                }
            }
            inn1Map.put("batting", battingList);

            // Format bowling stats
            List<Map<String, Object>> bowlingList = new ArrayList<>();
            if (scorecard.getTeam1BowlingScorecard() != null) {
                for (ScorecardBowlingEntryDTO entry : scorecard.getTeam1BowlingScorecard()) {
                    Map<String, Object> boEntry = new HashMap<>();
                    boEntry.put("playerName", entry.getPlayerName());
                    boEntry.put("overs", entry.getStats().getOversBowled());
                    boEntry.put("runsConceded", entry.getStats().getRunsConceded());
                    boEntry.put("wickets", entry.getStats().getWicketsTaken());
                    bowlingList.add(boEntry);
                }
            }
            inn1Map.put("bowling", bowlingList);
            
            // Calculate extras for Innings 1
            int totalBattingRuns = 0;
            for (Map<String, Object> b : battingList) {
                totalBattingRuns += (int) b.get("runs");
            }
            int extras = Math.max(0, inn1.getRuns() - totalBattingRuns);
            inn1Map.put("extras", extras);

            inningsList.add(inn1Map);
        }

        if (scorecard.getInnings2() != null) {
            Map<String, Object> inn2Map = new HashMap<>();
            Innings inn2 = scorecard.getInnings2();
            inn2Map.put("inningsNumber", 2);
            inn2Map.put("runs", inn2.getRuns());
            inn2Map.put("wickets", inn2.getWickets());
            inn2Map.put("overs", inn2.getOvers());
            inn2Map.put("balls", inn2.getBalls());
            
            // Target for Innings 2 is Innings 1 runs + 1
            int target = 0;
            if (scorecard.getInnings1() != null) {
                target = scorecard.getInnings1().getRuns() + 1;
            }
            inn2Map.put("target", target);
            
            inn2Map.put("battingTeam", inn2.getBattingTeam() != null ? inn2.getBattingTeam().getName() : "");
            inn2Map.put("bowlingTeam", inn2.getBowlingTeam() != null ? inn2.getBowlingTeam().getName() : "");

            // Format batting stats
            List<Map<String, Object>> battingList = new ArrayList<>();
            if (scorecard.getTeam2BattingScorecard() != null) {
                for (ScorecardBattingEntryDTO entry : scorecard.getTeam2BattingScorecard()) {
                    Map<String, Object> bEntry = new HashMap<>();
                    bEntry.put("playerName", entry.getPlayerName());
                    bEntry.put("runs", entry.getStats().getRunsScored());
                    bEntry.put("balls", entry.getStats().getBallsFaced());
                    bEntry.put("fours", entry.getStats().getFours());
                    bEntry.put("sixes", entry.getStats().getSixes());
                    bEntry.put("isOut", entry.getStats().isDismissed());
                    battingList.add(bEntry);
                }
            }
            inn2Map.put("batting", battingList);

            // Format bowling stats
            List<Map<String, Object>> bowlingList = new ArrayList<>();
            if (scorecard.getTeam2BowlingScorecard() != null) {
                for (ScorecardBowlingEntryDTO entry : scorecard.getTeam2BowlingScorecard()) {
                    Map<String, Object> boEntry = new HashMap<>();
                    boEntry.put("playerName", entry.getPlayerName());
                    boEntry.put("overs", entry.getStats().getOversBowled());
                    boEntry.put("runsConceded", entry.getStats().getRunsConceded());
                    boEntry.put("wickets", entry.getStats().getWicketsTaken());
                    bowlingList.add(boEntry);
                }
            }
            inn2Map.put("bowling", bowlingList);
            
            // Calculate extras for Innings 2
            int totalBattingRuns = 0;
            for (Map<String, Object> b : battingList) {
                totalBattingRuns += (int) b.get("runs");
            }
            int extras = Math.max(0, inn2.getRuns() - totalBattingRuns);
            inn2Map.put("extras", extras);

            inningsList.add(inn2Map);
        }

        Map<String, Object> scorecardContainer = new HashMap<>();
        scorecardContainer.put("innings", inningsList);
        scoreDetails.put("scorecard", scorecardContainer);

        return ResponseEntity.ok(scoreDetails);
    }

    // 9. Get Toss Market
    @GetMapping({"/api/v1/get/toss/{eventId}", "/api/v1/get/toss"})
    public ResponseEntity<?> getToss(
            HttpServletRequest request,
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "TOSS")) {
            return forbiddenResponse("Toss Market (TOSS)");
        }
        Long targetMatchId = resolveEventId(eventId, null, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId or id parameter is required"));
        }

        Optional<Match> matchOpt = matchRepository.findById(targetMatchId);
        if (matchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Match match = matchOpt.get();

        Map<String, Object> tossDetails = new HashMap<>();
        tossDetails.put("eventId", targetMatchId);
        tossDetails.put("tossWinner", match.getTossWinner() != null ? match.getTossWinner() : "");
        tossDetails.put("tossDecision", match.getTossDecision() != null ? match.getTossDecision() : "");
        tossDetails.put("status", match.getStatus() != null ? match.getStatus().name() : "SCHEDULED");

        return ResponseEntity.ok(tossDetails);
    }

    // 10. Get Tied Market
    @GetMapping({"/api/v1/get/tied/{eventId}", "/api/v1/get/tied"})
    public ResponseEntity<?> getTied(
            HttpServletRequest request,
            @PathVariable(required = false) Long eventId,
            @RequestParam(required = false) Long event_id,
            @RequestParam(required = false) Long matchId,
            @RequestParam(required = false) Long id,
            @RequestParam(required = false) String clientId,
            @RequestParam(required = false) String token
    ) {
        DeveloperKey key = getAuthorizedKey(request, clientId, token);
        if (key == null) {
            return unauthorizedResponse();
        }
        if (!hasPermission(key, "TIED")) {
            return forbiddenResponse("Tied Market (TIED)");
        }
        Long targetMatchId = resolveEventId(eventId, null, event_id, matchId, id);
        if (targetMatchId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId or id parameter is required"));
        }

        Optional<Match> matchOpt = matchRepository.findById(targetMatchId);
        if (matchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Match match = matchOpt.get();

        List<Map<String, Object>> tiedMarket = new ArrayList<>();
        
        Map<String, Object> runner1 = new HashMap<>();
        runner1.put("mid", String.valueOf(targetMatchId));
        runner1.put("openDate", match.getMatchDate() != null ? match.getMatchDate().toString() : "");
        runner1.put("sid", "1");
        runner1.put("nat", match.getTeamA() != null ? match.getTeamA().getName() : "Team A");
        runner1.put("b1", 98);
        runner1.put("bs1", 0);
        runner1.put("l1", 0);
        runner1.put("ls1", 0);
        runner1.put("s", "ACTIVE");
        runner1.put("sr", "1");
        
        Map<String, Object> runner2 = new HashMap<>();
        runner2.put("mid", String.valueOf(targetMatchId));
        runner2.put("openDate", match.getMatchDate() != null ? match.getMatchDate().toString() : "");
        runner2.put("sid", "2");
        runner2.put("nat", match.getTeamB() != null ? match.getTeamB().getName() : "Team B");
        runner2.put("b1", 98);
        runner2.put("bs1", 0);
        runner2.put("l1", 0);
        runner2.put("ls1", 0);
        runner2.put("s", "ACTIVE");
        runner2.put("sr", "2");
        
        tiedMarket.add(runner1);
        tiedMarket.add(runner2);

        return ResponseEntity.ok(tiedMarket);
    }
}
