package com.champion_sports.backend.tournaments;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.champion_sports.backend.teams.Team;

public interface TournamentTeamRepository
        extends JpaRepository<TournamentTeam, Long> {

    List<TournamentTeam> findByTournament(
            Tournament tournament
    );

    Optional<TournamentTeam>
    findByTournamentAndTeam(
            Tournament tournament,
            Team team
    );
}