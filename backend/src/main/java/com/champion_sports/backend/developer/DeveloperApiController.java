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
        return ResponseEntity.ok(matches);
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
        Long targetMatchId = eventId != null ? eventId : id;
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
        Long targetMatchId = eventId != null ? eventId : id;
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
        Long targetMatchId = eventId != null ? eventId : id;
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
        if (eventId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId query parameter is required"));
        }
        List<CricketSession> sessions = cricketSessionRepository.findByMatchId(eventId);
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
        if (eventId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId query parameter is required"));
        }

        Optional<Match> matchOpt = matchRepository.findById(eventId);
        if (matchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Match match = matchOpt.get();

        Map<String, Object> tvDetails = new HashMap<>();
        tvDetails.put("eventId", eventId);
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
        if (eventId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "eventId query parameter is required"));
        }

        Optional<Match> matchOpt = matchRepository.findById(eventId);
        if (matchOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Match match = matchOpt.get();
        ScorecardStateDTO scorecard = scoringService.getScorecardState(eventId);

        Map<String, Object> scoreDetails = new HashMap<>();
        scoreDetails.put("eventId", eventId);
        scoreDetails.put("status", match.getStatus() != null ? match.getStatus().name() : "SCHEDULED");
        scoreDetails.put("venue", match.getVenue());
        scoreDetails.put("matchDate", match.getMatchDate());
        scoreDetails.put("teamA", match.getTeamA() != null ? match.getTeamA().getName() : "");
        scoreDetails.put("teamB", match.getTeamB() != null ? match.getTeamB().getName() : "");
        scoreDetails.put("tossWinner", match.getTossWinner());
        scoreDetails.put("tossDecision", match.getTossDecision());
        scoreDetails.put("scorecard", scorecard);

        return ResponseEntity.ok(scoreDetails);
    }

    // 9. Get Toss Market
    @GetMapping({"/api/v1/get/toss/{eventId}", "/api/v1/get/toss"})
    public ResponseEntity<?> getToss(
            HttpServletRequest request,
            @PathVariable(required = false) Long eventId,
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
        Long targetMatchId = eventId != null ? eventId : id;
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
        Long targetMatchId = eventId != null ? eventId : id;
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
