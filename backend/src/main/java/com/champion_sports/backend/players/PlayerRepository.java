package com.champion_sports.backend.players;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.champion_sports.backend.teams.Team;

public interface PlayerRepository extends JpaRepository<Player, Long> {

    List<Player> findByTeam(Team team);

    List<Player> findByTeamId(Long teamId);

    List<Player> findByJerseyNumber(Integer jerseyNumber);

}