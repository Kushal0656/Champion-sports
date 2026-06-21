package com.champion_sports.backend.scoreboard;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scoreboard")
@CrossOrigin(origins = "*")
public class ScoreboardController {

    private final ScoreboardService scoreboardService;

    public ScoreboardController(
            ScoreboardService scoreboardService
    ) {
        this.scoreboardService = scoreboardService;
    }

    @GetMapping("/{inningsId}")
    public ScoreboardDTO getScoreboard(
            @PathVariable Long inningsId
    ) {
        return scoreboardService.getScoreboard(
                inningsId
        );
    }
}