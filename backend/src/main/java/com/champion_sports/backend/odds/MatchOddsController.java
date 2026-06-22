package com.champion_sports.backend.odds;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.tournaments.PointsTable;
import com.champion_sports.backend.tournaments.PointsTableRepository;
import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.teams.Team;

@RestController
@RequestMapping("/api/admin/match-odds")
@CrossOrigin(origins = "*")
public class MatchOddsController {

    private final MatchOddsRepository matchOddsRepository;
    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;
    private final PointsTableRepository pointsTableRepository;
    private final BallRepository ballRepository;
    private final DatasetExportService datasetExportService;
    private final HybridOddsService hybridOddsService;

    public MatchOddsController(
            MatchOddsRepository matchOddsRepository,
            MatchRepository matchRepository,
            InningsRepository inningsRepository,
            PointsTableRepository pointsTableRepository,
            BallRepository ballRepository,
            DatasetExportService datasetExportService,
            HybridOddsService hybridOddsService
    ) {
        this.matchOddsRepository = matchOddsRepository;
        this.matchRepository = matchRepository;
        this.inningsRepository = inningsRepository;
        this.pointsTableRepository = pointsTableRepository;
        this.ballRepository = ballRepository;
        this.datasetExportService = datasetExportService;
        this.hybridOddsService = hybridOddsService;
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

    @GetMapping("/{matchId}/calculate")
    public ResponseEntity<MatchOdds> calculateOdds(@PathVariable Long matchId) {
        // Trigger calculation via HybridOddsService which updates the DB
        hybridOddsService.getLiveOdds(matchId);
        
        MatchOdds odds = matchOddsRepository.findByMatchId(matchId)
                .orElseThrow(() -> new RuntimeException("Match odds not found after calculation"));
        return ResponseEntity.ok(odds);
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportDataset() {
        String csv = datasetExportService.exportToCsv();
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=\"matches.csv\"")
                .body(csv);
    }
}
