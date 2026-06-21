package com.champion_sports.backend.stats;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;

@RestController
@RequestMapping("/api/batting-stats")
@CrossOrigin(origins = "*")
public class BattingStatsController {

    private final BattingStatsService battingStatsService;
    private final InningsRepository inningsRepository;

    public BattingStatsController(
            BattingStatsService battingStatsService,
            InningsRepository inningsRepository
    ) {
        this.battingStatsService = battingStatsService;
        this.inningsRepository = inningsRepository;
    }

    @GetMapping("/{inningsId}")
    public List<BattingStats> getBattingStats(
            @PathVariable Long inningsId
    ) {

        Innings innings =
                inningsRepository.findById(
                        inningsId
                )
                .orElseThrow(
                        () -> new RuntimeException(
                                "Innings not found"
                        )
                );

        return battingStatsService.getByInnings(
                innings
        );
    }
}