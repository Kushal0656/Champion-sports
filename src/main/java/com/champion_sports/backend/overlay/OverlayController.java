package com.champion_sports.backend.overlay;

import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.websocket.LiveScoreWebSocketHandler;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/overlay")
@CrossOrigin(origins = "*")
public class OverlayController {

    private final MatchRepository matchRepository;
    private final LiveScoreWebSocketHandler webSocketHandler;

    public OverlayController(MatchRepository matchRepository, LiveScoreWebSocketHandler webSocketHandler) {
        this.matchRepository = matchRepository;
        this.webSocketHandler = webSocketHandler;
    }

    @GetMapping("/{matchId}/state")
    public Map<String, String> getOverlayState(@PathVariable Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));
        return Map.of("activeOverlay", match.getActiveOverlay() != null ? match.getActiveOverlay() : "NONE");
    }

    @PostMapping("/{matchId}/toggle")
    public Map<String, String> toggleOverlay(@PathVariable Long matchId, @RequestBody Map<String, String> request) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));
        
        String newOverlay = request.getOrDefault("activeOverlay", "NONE");
        match.setActiveOverlay(newOverlay);
        matchRepository.save(match);

        Map<String, String> state = Map.of("activeOverlay", newOverlay);
        webSocketHandler.broadcastOverlay(matchId, state);
        return state;
    }
}
