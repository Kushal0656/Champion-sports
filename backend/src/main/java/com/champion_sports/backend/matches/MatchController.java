package com.champion_sports.backend.matches;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches")
@CrossOrigin(origins = "*")
public class MatchController {

    private final MatchService matchService;
    private final MatchResultService matchResultService;

    public MatchController(
            MatchService matchService,
            MatchResultService matchResultService
    ) {
        this.matchService = matchService;
        this.matchResultService = matchResultService;
    }

    @GetMapping
    public List<Match> getAllMatches(
            @RequestParam(value = "tournamentId", required = false) Long tournamentId
    ) {
        if (tournamentId != null) {
            return matchService.getMatchesByTournamentId(tournamentId);
        }
        return matchService.getAllMatches();
    }

    @GetMapping("/{id}")
    public Match getMatchById(
            @PathVariable Long id
    ) {
        return matchService.getMatchById(id);
    }

    @PostMapping
    public Match createMatch(
            @RequestBody Match match
    ) {
        return matchService.createMatch(match);
    }

    @PutMapping("/{id}")
    public Match updateMatch(
            @PathVariable Long id,
            @RequestBody Match match
    ) {
        return matchService.updateMatch(
                id,
                match
        );
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> completeMatch(
            @PathVariable Long id
    ) {
        try {
            matchResultService.completeMatch(id);
            return ResponseEntity.ok(matchService.getMatchById(id));
        } catch (RuntimeException ex) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "An error occurred"));
    }

    @DeleteMapping("/{id}")
    public String deleteMatch(
            @PathVariable Long id
    ) {

        matchService.deleteMatch(id);

        return "Match deleted successfully";
    }
}