package com.champion_sports.backend.scores;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scoring")
@CrossOrigin(origins = "*")
public class ScoringController {

    private final ScoringService scoringService;

    public ScoringController(ScoringService scoringService) {
        this.scoringService = scoringService;
    }

    @GetMapping("/{matchId}/state")
    public ScorecardStateDTO getScorecardState(@PathVariable Long matchId) {
        return scoringService.getScorecardState(matchId);
    }

    @PostMapping("/{matchId}/rebuild")
    public ScorecardStateDTO rebuildMatch(@PathVariable Long matchId) {
        return scoringService.rebuildMatch(matchId);
    }

    @PostMapping("/{matchId}/ball")
    public ScorecardStateDTO addBall(@PathVariable Long matchId, @RequestBody BallInputDTO input) {
        return scoringService.addBall(matchId, input);
    }

    @PostMapping("/{matchId}/undo")
    public ScorecardStateDTO undoLastBall(@PathVariable Long matchId) {
        return scoringService.undoLastBall(matchId);
    }
}
