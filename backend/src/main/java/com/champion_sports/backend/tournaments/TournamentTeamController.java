package com.champion_sports.backend.tournaments;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.teams.TeamRepository;

@RestController
@RequestMapping("/api/tournament-teams")
@CrossOrigin(origins = "*")
public class TournamentTeamController {

    private final TournamentService tournamentService;
    private final TeamRepository teamRepository;
    private final TournamentTeamService tournamentTeamService;

    public TournamentTeamController(
            TournamentService tournamentService,
            TeamRepository teamRepository,
            TournamentTeamService tournamentTeamService
    ) {
        this.tournamentService =
                tournamentService;

        this.teamRepository =
                teamRepository;

        this.tournamentTeamService =
                tournamentTeamService;
    }

    @PostMapping(
            "/{tournamentId}/{teamId}"
    )
    public TournamentTeam addTeam(
            @PathVariable Long tournamentId,
            @PathVariable Long teamId
    ) {

        Tournament tournament =
                tournamentService
                        .getTournamentById(
                                tournamentId
                        );

        Team team =
                teamRepository
                        .findById(teamId)
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Team not found"
                                        )
                        );

        return tournamentTeamService
                .addTeam(
                        tournament,
                        team
                );
    }

    @GetMapping(
            "/{tournamentId}"
    )
    public List<TournamentTeam> getTeams(
            @PathVariable Long tournamentId
    ) {

        Tournament tournament =
                tournamentService
                        .getTournamentById(
                                tournamentId
                        );

        return tournamentTeamService
                .getTeams(
                        tournament
                );
    }
}