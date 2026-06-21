package com.champion_sports.backend.broadcast;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;

@Service
public class LiveScoreService {

    private final InningsRepository inningsRepository;
    private final BallRepository ballRepository;

    public LiveScoreService(
            InningsRepository inningsRepository,
            BallRepository ballRepository
    ) {
        this.inningsRepository = inningsRepository;
        this.ballRepository = ballRepository;
    }

    public LiveScoreDTO getLiveScore(
            Long inningsId
    ) {

        Innings innings =
                inningsRepository.findById(
                        inningsId
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Innings not found"
                        ));

        LiveScoreDTO dto =
                new LiveScoreDTO();

        if (innings.getBattingTeam() != null) {

    dto.setBattingTeam(
            innings.getBattingTeam().getName()
    );

} else {

    dto.setBattingTeam(
            "TEAM"
    );
}

        dto.setRuns(
                innings.getRuns()
        );

        dto.setWickets(
                innings.getWickets()
        );

        dto.setOvers(
                innings.getOvers()
                        + "."
                        + innings.getBalls()
        );

        List<Ball> balls =
                ballRepository
                        .findByInningsOrderByOverNumberAscBallNumberAsc(
                                innings
                        );

        List<String> lastSix =
                new ArrayList<>();

        int start =
                Math.max(
                        balls.size() - 6,
                        0
                );

        for (
                int i = start;
                i < balls.size();
                i++
        ) {

            Ball ball =
                    balls.get(i);

            if (
                    Boolean.TRUE.equals(
                            ball.getWicket()
                    )
            ) {
                lastSix.add("W");
            } else {
                lastSix.add(
                        String.valueOf(
                                ball.getRuns()
                        )
                );
            }
        }

        dto.setLastSixBalls(
                lastSix
        );

        return dto;
    }
}