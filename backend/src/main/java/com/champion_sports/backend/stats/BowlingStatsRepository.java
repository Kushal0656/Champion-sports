package com.champion_sports.backend.stats;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.players.Player;

public interface BowlingStatsRepository
        extends JpaRepository<BowlingStats, Long> {

    List<BowlingStats> findByInnings(
            Innings innings
    );

    List<BowlingStats> findByInningsAndPlayer(
            Innings innings,
            Player player
    );
}