package com.champion_sports.backend.matches;

import java.util.List;

import org.springframework.stereotype.Service;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.tournaments.PointsTable;
import com.champion_sports.backend.tournaments.PointsTableService;
import com.champion_sports.backend.tournaments.Tournament;

@Service
public class MatchResultService {

    private final InningsRepository inningsRepository;
    private final MatchService matchService;
    private final PointsTableService pointsTableService;

    public MatchResultService(
            InningsRepository inningsRepository,
            MatchService matchService,
            PointsTableService pointsTableService
    ) {
        this.inningsRepository = inningsRepository;
        this.matchService = matchService;
        this.pointsTableService = pointsTableService;
    }

    public MatchResultDTO getResult(
            Match match
    ) {

        List<Innings> inningsList =
                inningsRepository.findByMatch(match);

        if (inningsList.size() < 2) {
            throw new RuntimeException(
                    "Match not completed"
            );
        }

        Innings first = inningsList.get(0);
        Innings second = inningsList.get(1);

        MatchResultDTO dto =
                new MatchResultDTO();

        dto.setTarget(
                first.getRuns() + 1
        );

        if (second.getRuns() > first.getRuns()) {

            dto.setWinner(
                    second.getBattingTeam().getName()
            );

            dto.setWinningMargin(
                    10 - second.getWickets()
            );

            dto.setResult(
                    "Won by "
                            + (10 - second.getWickets())
                            + " wickets"
            );

        } else if (first.getRuns() > second.getRuns()) {

            dto.setWinner(
                    first.getBattingTeam().getName()
            );

            dto.setWinningMargin(
                    first.getRuns()
                            - second.getRuns()
            );

            dto.setResult(
                    "Won by "
                            + (first.getRuns()
                            - second.getRuns())
                            + " runs"
            );

        } else {

            dto.setWinner("TIE");
            dto.setWinningMargin(0);
            dto.setResult("Match Tied");
        }

        return dto;
    }

    public void completeMatch(
            Long matchId
    ) {

        Match match =
                matchService.getMatchById(
                        matchId
                );

        if (match.getStatus() == MatchStatus.COMPLETED) {
            return;
        }

        MatchResultDTO result =
                getResult(match);

        if ("TIE".equals(result.getWinner())) {

            match.setWinner(null);

        } else if (
                result.getWinner().equals(
                        match.getTeamA().getName()
                )
        ) {

            match.setWinner(
                    match.getTeamA()
            );

        } else if (
                result.getWinner().equals(
                        match.getTeamB().getName()
                )
        ) {

            match.setWinner(
                    match.getTeamB()
            );
        }

        match.setStatus(
                MatchStatus.COMPLETED
        );
        match.setResultMargin(result.getResult());

        matchService.updateMatch(
                match.getId(),
                match
        );

        if (match.getTournament() != null) {

            Tournament tournament =
                    match.getTournament();

            PointsTable teamA =
                    pointsTableService.createEntry(
                            tournament,
                            match.getTeamA()
                    );

            PointsTable teamB =
                    pointsTableService.createEntry(
                            tournament,
                            match.getTeamB()
                    );

            if (
                    "TIE".equals(
                            result.getWinner()
                    )
            ) {

                pointsTableService.recordTie(
                        teamA
                );

                pointsTableService.recordTie(
                        teamB
                );

            } else if (
                    result.getWinner().equals(
                            match.getTeamA().getName()
                    )
            ) {

                pointsTableService.recordWin(
                        teamA
                );

                pointsTableService.recordLoss(
                        teamB
                );

            } else if (
                    result.getWinner().equals(
                            match.getTeamB().getName()
                    )
            ) {

                pointsTableService.recordWin(
                        teamB
                );

                pointsTableService.recordLoss(
                        teamA
                );
            }
            pointsTableService.recalculateNetRunRates(tournament);
        }
    }
}