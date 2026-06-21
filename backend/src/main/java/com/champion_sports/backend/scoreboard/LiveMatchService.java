package com.champion_sports.backend.scoreboard;

import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LiveMatchService {

    private final InningsRepository inningsRepository;
    private final BallRepository ballRepository;

    public LiveMatchService(
            InningsRepository inningsRepository,
            BallRepository ballRepository
    ) {
        this.inningsRepository = inningsRepository;
        this.ballRepository = ballRepository;
    }

    public LiveMatchDTO getLiveMatch(
            Long inningsId
    ) {

        Innings innings = inningsRepository
                .findById(inningsId)
                .orElseThrow(() ->
                        new RuntimeException("Innings not found"));

        LiveMatchDTO dto = new LiveMatchDTO();

        dto.setBattingTeam(
                innings.getBattingTeam().getName()
        );

        dto.setBowlingTeam(
                innings.getBowlingTeam().getName()
        );

        dto.setRuns(
                innings.getRuns()
        );

        dto.setWickets(
                innings.getWickets()
        );

        dto.setOvers(
                innings.getOvers()
        );

        dto.setBalls(
                innings.getBalls()
        );

        double totalOvers =
                innings.getOvers()
                        + (innings.getBalls() / 6.0);

        dto.setRunRate(
                totalOvers == 0
                        ? 0
                        : innings.getRuns() / totalOvers
        );

        List<Ball> balls =
                ballRepository
                        .findByInningsOrderByOverNumberAscBallNumberAsc(
                                innings
                        );

        if (!balls.isEmpty()) {

            Ball latestBall =
                    balls.get(balls.size() - 1);

            if (latestBall.getStriker() != null) {
                dto.setStriker(
                        latestBall.getStriker().getName()
                );
            }

            if (latestBall.getNonStriker() != null) {
                dto.setNonStriker(
                        latestBall.getNonStriker().getName()
                );
            }

            if (latestBall.getBowler() != null) {
                dto.setBowler(
                        latestBall.getBowler().getName()
                );
            }
        }

        return dto;
    }
}