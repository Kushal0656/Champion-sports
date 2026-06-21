package com.champion_sports.backend.tournaments;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/points-table")
@CrossOrigin(origins = "*")
public class PointsTableController {

    private final TournamentService tournamentService;
    private final PointsTableService pointsTableService;

    public PointsTableController(
            TournamentService tournamentService,
            PointsTableService pointsTableService
    ) {
        this.tournamentService = tournamentService;
        this.pointsTableService = pointsTableService;
    }

    @GetMapping("/{tournamentId}")
    public List<PointsTable> getTable(
            @PathVariable Long tournamentId
    ) {

        Tournament tournament =
                tournamentService.getTournamentById(
                        tournamentId
                );

        return pointsTableService.getTable(
                tournament
        );
    }
}