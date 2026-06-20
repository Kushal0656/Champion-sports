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
@RequestMapping("/api/bowling-stats")
@CrossOrigin(origins = "*")
public class BowlingStatsController {

    private final BowlingStatsService bowlingStatsService;
    private final InningsRepository inningsRepository;

    public BowlingStatsController(
            BowlingStatsService bowlingStatsService,
            InningsRepository inningsRepository
    ) {
        this.bowlingStatsService = bowlingStatsService;
        this.inningsRepository = inningsRepository;
    }

    @GetMapping("/{inningsId}")
    public List<BowlingStats> getByInnings(
            @PathVariable Long inningsId
    ) {

        Innings innings =
                inningsRepository.findById(inningsId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Innings not found"
                                ));

        return bowlingStatsService.getByInnings(
                innings
        );
    }
}