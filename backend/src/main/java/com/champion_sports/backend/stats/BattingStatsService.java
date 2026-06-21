package com.champion_sports.backend.stats;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.players.Player;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BattingStatsService {

    private final BattingStatsRepository battingStatsRepository;

    public BattingStatsService(
            BattingStatsRepository battingStatsRepository
    ) {
        this.battingStatsRepository = battingStatsRepository;
    }

    public List<BattingStats> getByInnings(Innings innings) {
        return battingStatsRepository.findByInnings(innings);
    }

    public BattingStats getOrCreate(
            Innings innings,
            Player player
    ) {
        List<BattingStats> list = battingStatsRepository.findByInningsAndPlayer(innings, player);
        if (list.isEmpty()) {
            BattingStats stats = new BattingStats();
            stats.setInnings(innings);
            stats.setPlayer(player);
            return battingStatsRepository.save(stats);
        } else {
            BattingStats first = list.get(0);
            if (list.size() > 1) {
                for (int i = 1; i < list.size(); i++) {
                    battingStatsRepository.delete(list.get(i));
                }
            }
            return first;
        }
    }

    public void recordRuns(
            Innings innings,
            Player player,
            Integer runs
    ) {

        BattingStats stats =
                getOrCreate(innings, player);

        stats.setRuns(
                stats.getRuns() + runs
        );

        stats.setBalls(
                stats.getBalls() + 1
        );

        if (runs == 4) {
            stats.setFours(
                    stats.getFours() + 1
            );
        }

        if (runs == 6) {
            stats.setSixes(
                    stats.getSixes() + 1
            );
        }

        battingStatsRepository.save(stats);
    }

    public void undoRuns(
            Innings innings,
            Player player,
            Integer runs
    ) {
        BattingStats stats = getOrCreate(innings, player);
        stats.setRuns(Math.max(0, stats.getRuns() - runs));
        stats.setBalls(Math.max(0, stats.getBalls() - 1));
        if (runs == 4) {
            stats.setFours(Math.max(0, stats.getFours() - 1));
        }
        if (runs == 6) {
            stats.setSixes(Math.max(0, stats.getSixes() - 1));
        }
        battingStatsRepository.save(stats);
    }

    public void recordWicket(
            Innings innings,
            Player player,
            String dismissalType
    ) {

        BattingStats stats =
                getOrCreate(innings, player);

        stats.setOut(true);
        stats.setDismissalType(dismissalType);

        battingStatsRepository.save(stats);
    }

    public void undoWicket(
            Innings innings,
            Player player
    ) {
        BattingStats stats = getOrCreate(innings, player);
        stats.setOut(false);
        stats.setDismissalType(null);
        battingStatsRepository.save(stats);
    }
}