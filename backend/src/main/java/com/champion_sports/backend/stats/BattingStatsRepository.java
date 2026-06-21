package com.champion_sports.backend.stats;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.players.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BattingStatsRepository extends JpaRepository<BattingStats, Long> {

    List<BattingStats> findByInnings(Innings innings);

    List<BattingStats> findByInningsAndPlayer(
            Innings innings,
            Player player
    );
}