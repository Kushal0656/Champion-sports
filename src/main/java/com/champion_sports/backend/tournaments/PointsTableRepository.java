package com.champion_sports.backend.tournaments;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.champion_sports.backend.teams.Team;

public interface PointsTableRepository
        extends JpaRepository<PointsTable, Long> {

    List<PointsTable> findByTournament(
            Tournament tournament
    );

    Optional<PointsTable> findByTournamentAndTeam(
            Tournament tournament,
            Team team
    );
}