package com.champion_sports.backend.stats;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;

@RestController
@RequestMapping("/api/scorecard")
@CrossOrigin(origins = "*")
public class ScorecardController {

    private final BattingStatsService battingStatsService;
    private final BowlingStatsService bowlingStatsService;
    private final InningsRepository inningsRepository;

    public ScorecardController(
            BattingStatsService battingStatsService,
            BowlingStatsService bowlingStatsService,
            InningsRepository inningsRepository
    ) {
        this.battingStatsService = battingStatsService;
        this.bowlingStatsService = bowlingStatsService;
        this.inningsRepository = inningsRepository;
    }

    @GetMapping("/{inningsId}")
    public ScorecardDTO getScorecard(
            @PathVariable Long inningsId
    ) {

        Innings innings =
                inningsRepository.findById(
                        inningsId
                ).orElseThrow(() ->
                        new RuntimeException(
                                "Innings not found"
                        ));

        ScorecardDTO dto =
                new ScorecardDTO();

        dto.setBatting(
                battingStatsService
                        .getByInnings(
                                innings
                        )
        );

        dto.setBowling(
                bowlingStatsService
                        .getByInnings(
                                innings
                        )
        );

        return dto;
    }
}