package com.champion_sports.backend.odds;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/match-odds")
@CrossOrigin(origins = "*")
public class MatchOddsController {

    private final MatchOddsRepository matchOddsRepository;

    public MatchOddsController(MatchOddsRepository matchOddsRepository) {
        this.matchOddsRepository = matchOddsRepository;
    }

    @GetMapping("/{matchId}")
    public ResponseEntity<MatchOdds> getOdds(@PathVariable Long matchId) {
        MatchOdds odds = matchOddsRepository.findByMatchId(matchId)
                .orElseGet(() -> {
                    MatchOdds newOdds = new MatchOdds(matchId, 1.90, 1.90, 4.00, 1.90);
                    return matchOddsRepository.save(newOdds);
                });
        return ResponseEntity.ok(odds);
    }

    @PostMapping("/{matchId}")
    public ResponseEntity<MatchOdds> saveOdds(
            @PathVariable Long matchId,
            @RequestBody MatchOdds input
    ) {
        MatchOdds odds = matchOddsRepository.findByMatchId(matchId)
                .orElse(new MatchOdds());
        
        odds.setMatchId(matchId);
        odds.setTeamAOdds(input.getTeamAOdds() != null ? input.getTeamAOdds() : 1.90);
        odds.setTeamBOdds(input.getTeamBOdds() != null ? input.getTeamBOdds() : 1.90);
        odds.setDrawOdds(input.getDrawOdds() != null ? input.getDrawOdds() : 4.00);
        odds.setBookmakerOdds(input.getBookmakerOdds() != null ? input.getBookmakerOdds() : 1.90);
        odds.setUpdatedAt(LocalDateTime.now());

        MatchOdds saved = matchOddsRepository.save(odds);
        return ResponseEntity.ok(saved);
    }
}
