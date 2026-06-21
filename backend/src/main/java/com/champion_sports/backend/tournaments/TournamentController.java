package com.champion_sports.backend.tournaments;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tournaments")
@CrossOrigin(origins = "*")
public class TournamentController {

    private final TournamentService tournamentService;
    private final PointsTableService pointsTableService;

    public TournamentController(
            TournamentService tournamentService,
            PointsTableService pointsTableService
    ) {
        this.tournamentService = tournamentService;
        this.pointsTableService = pointsTableService;
    }

    @GetMapping
    public List<Tournament> getAll() {
        return tournamentService.getAllTournaments();
    }

    @GetMapping("/{id}")
    public Tournament getById(
            @PathVariable Long id
    ) {
        return tournamentService.getTournamentById(id);
    }

    @PostMapping
    public Tournament create(
            @RequestBody Tournament tournament
    ) {
        return tournamentService.createTournament(tournament);
    }

    @GetMapping("/{id}/standings")
    public List<StandingDTO> getStandings(
            @PathVariable Long id
    ) {
        Tournament tournament = tournamentService.getTournamentById(id);
        List<PointsTable> table = pointsTableService.getTable(tournament);

        return table.stream()
                .map(pt -> new StandingDTO(
                        pt.getTeam().getId(),
                        pt.getTeam().getName(),
                        pt.getTeam().getLogoUrl(),
                        pt.getMatchesPlayed(),
                        pt.getWins(),
                        pt.getLosses(),
                        pt.getPoints(),
                        pt.getNetRunRate()
                ))
                .sorted((a, b) -> {
                    int ptsDiff = b.getPoints().compareTo(a.getPoints());
                    if (ptsDiff != 0) return ptsDiff;
                    return b.getNetRunRate().compareTo(a.getNetRunRate());
                })
                .collect(Collectors.toList());
    }
}