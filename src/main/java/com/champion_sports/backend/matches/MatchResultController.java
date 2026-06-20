package com.champion_sports.backend.matches;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/match-results")
@CrossOrigin(origins = "*")
public class MatchResultController {

    private final MatchService matchService;
    private final MatchResultService matchResultService;

    public MatchResultController(
            MatchService matchService,
            MatchResultService matchResultService
    ) {
        this.matchService = matchService;
        this.matchResultService = matchResultService;
    }

    @GetMapping("/{matchId}")
    public MatchResultDTO getResult(
            @PathVariable Long matchId
    ) {

        Match match =
                matchService.getMatchById(
                        matchId
                );

        return matchResultService
                .getResult(match);
    }
}