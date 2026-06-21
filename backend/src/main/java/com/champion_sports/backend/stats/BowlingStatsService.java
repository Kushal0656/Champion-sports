package com.champion_sports.backend.stats;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.players.Player;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BowlingStatsService {

    private final BowlingStatsRepository bowlingStatsRepository;

    public BowlingStatsService(
            BowlingStatsRepository bowlingStatsRepository
    ) {
        this.bowlingStatsRepository = bowlingStatsRepository;
    }

    public List<BowlingStats> getByInnings(Innings innings) {
        return bowlingStatsRepository.findByInnings(innings);
    }

    public BowlingStats getOrCreate(
            Innings innings,
            Player player
    ) {
        List<BowlingStats> list = bowlingStatsRepository.findByInningsAndPlayer(innings, player);
        if (list.isEmpty()) {
            BowlingStats stats = new BowlingStats();
            stats.setInnings(innings);
            stats.setPlayer(player);
            return bowlingStatsRepository.save(stats);
        } else {
            BowlingStats first = list.get(0);
            if (list.size() > 1) {
                for (int i = 1; i < list.size(); i++) {
                    bowlingStatsRepository.delete(list.get(i));
                }
            }
            return first;
        }
    }

    public void recordBall(
            Innings innings,
            Player bowler,
            Integer runs,
            Boolean wicket,
            Boolean wide,
            Boolean noBall
    ) {

        BowlingStats stats =
                getOrCreate(
                        innings,
                        bowler
                );

        stats.setRunsConceded(
                stats.getRunsConceded() + runs
        );

        if (!Boolean.TRUE.equals(wide) && !Boolean.TRUE.equals(noBall)) {
            int balls = stats.getBalls() + 1;

            if (balls == 6) {

                stats.setOvers(
                        stats.getOvers() + 1
                );

                balls = 0;
            }

            stats.setBalls(balls);
        }

        if (Boolean.TRUE.equals(wicket)) {

            stats.setWickets(
                    stats.getWickets() + 1
            );
        }

        bowlingStatsRepository.save(stats);
    }

    public void undoBall(
            Innings innings,
            Player bowler,
            Integer runs,
            Boolean wicket,
            Boolean wide,
            Boolean noBall
    ) {
        BowlingStats stats = getOrCreate(innings, bowler);

        stats.setRunsConceded(Math.max(0, stats.getRunsConceded() - runs));

        if (!Boolean.TRUE.equals(wide) && !Boolean.TRUE.equals(noBall)) {
            int balls = stats.getBalls();
            if (balls == 0) {
                stats.setOvers(Math.max(0, stats.getOvers() - 1));
                stats.setBalls(5);
            } else {
                stats.setBalls(balls - 1);
            }
        }

        if (Boolean.TRUE.equals(wicket)) {
            stats.setWickets(Math.max(0, stats.getWickets() - 1));
        }

        bowlingStatsRepository.save(stats);
    }
}