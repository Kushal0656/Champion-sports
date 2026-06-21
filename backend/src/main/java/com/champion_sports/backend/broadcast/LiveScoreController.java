package com.champion_sports.backend.broadcast;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/live-score")
@CrossOrigin(origins = "*")
public class LiveScoreController {

    private final LiveScoreService liveScoreService;

    public LiveScoreController(
            LiveScoreService liveScoreService
    ) {
        this.liveScoreService = liveScoreService;
    }

    @GetMapping("/{inningsId}")
    public LiveScoreDTO getScore(
            @PathVariable Long inningsId
    ) {

        return liveScoreService.getLiveScore(
                inningsId
        );
    }
}