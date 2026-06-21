package com.champion_sports.backend.scoreboard;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import org.springframework.stereotype.Service;

@Service
public class ScoreboardService {

    private final InningsRepository inningsRepository;

    public ScoreboardService(
            InningsRepository inningsRepository
    ) {
        this.inningsRepository = inningsRepository;
    }

    public ScoreboardDTO getScoreboard(
            Long inningsId
    ) {

        Innings innings = inningsRepository
                .findById(inningsId)
                .orElseThrow(() ->
                        new RuntimeException("Innings not found"));

        ScoreboardDTO dto = new ScoreboardDTO();

        dto.setBattingTeam(
                innings.getBattingTeam().getName()
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

        double runRate = totalOvers == 0
                ? 0
                : innings.getRuns() / totalOvers;

        dto.setRunRate(runRate);

        return dto;
    }
}