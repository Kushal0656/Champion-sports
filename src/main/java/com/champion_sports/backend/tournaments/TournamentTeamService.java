package com.champion_sports.backend.tournaments;

import java.util.List;

import org.springframework.stereotype.Service;

import com.champion_sports.backend.teams.Team;

@Service
public class TournamentTeamService {

    private final TournamentTeamRepository repository;
    private final PointsTableService pointsTableService;

    public TournamentTeamService(
            TournamentTeamRepository repository,
            PointsTableService pointsTableService
    ) {
        this.repository = repository;
        this.pointsTableService = pointsTableService;
    }

    public TournamentTeam addTeam(
            Tournament tournament,
            Team team
    ) {

        return repository
                .findByTournamentAndTeam(
                        tournament,
                        team
                )
                .orElseGet(() -> {

                    TournamentTeam tt =
                            new TournamentTeam();

                    tt.setTournament(
                            tournament
                    );

                    tt.setTeam(team);

                    TournamentTeam saved =
                            repository.save(tt);

                    pointsTableService
                            .createEntry(
                                    tournament,
                                    team
                            );

                    return saved;
                });
    }

    public List<TournamentTeam> getTeams(
            Tournament tournament
    ) {
        return repository.findByTournament(
                tournament
        );
    }
}