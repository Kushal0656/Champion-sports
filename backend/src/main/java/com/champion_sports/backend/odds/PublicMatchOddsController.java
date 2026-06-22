package com.champion_sports.backend.odds;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/match-odds")
@CrossOrigin(origins = "*")
public class PublicMatchOddsController {

    private final HybridOddsService hybridOddsService;

    public PublicMatchOddsController(HybridOddsService hybridOddsService) {
        this.hybridOddsService = hybridOddsService;
    }

    @GetMapping("/{matchId}/live")
    public ResponseEntity<LiveOddsResponse> getLiveOdds(@PathVariable Long matchId) {
        LiveOddsResponse response = hybridOddsService.getLiveOdds(matchId);
        return ResponseEntity.ok(response);
    }
}
