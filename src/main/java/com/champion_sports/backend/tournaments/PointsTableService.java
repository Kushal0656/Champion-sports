package com.champion_sports.backend.tournaments;

import java.util.List;

import org.springframework.stereotype.Service;

import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;

@Service
public class PointsTableService {

    private final PointsTableRepository pointsTableRepository;
    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;

    public PointsTableService(
            PointsTableRepository pointsTableRepository,
            MatchRepository matchRepository,
            InningsRepository inningsRepository
    ) {
        this.pointsTableRepository = pointsTableRepository;
        this.matchRepository = matchRepository;
        this.inningsRepository = inningsRepository;
    }

    public List<PointsTable> getTable(
            Tournament tournament
    ) {
        return pointsTableRepository
                .findByTournament(tournament);
    }

    public PointsTable save(
            PointsTable entry
    ) {
        return pointsTableRepository.save(entry);
    }
    public PointsTable createEntry(
        Tournament tournament,
        Team team
) {

    return pointsTableRepository
            .findByTournamentAndTeam(
                    tournament,
                    team
            )
            .orElseGet(() -> {

                PointsTable entry =
                        new PointsTable();

                entry.setTournament(
                        tournament
                );

                entry.setTeam(team);

                return pointsTableRepository
                        .save(entry);
            });
}

    public void recordWin(
            PointsTable entry
    ) {

        entry.setMatchesPlayed(
                entry.getMatchesPlayed() + 1
        );

        entry.setWins(
                entry.getWins() + 1
        );

        entry.setPoints(
                entry.getPoints() + 2
        );

        pointsTableRepository.save(entry);
    }

    public void recordLoss(
            PointsTable entry
    ) {

        entry.setMatchesPlayed(
                entry.getMatchesPlayed() + 1
        );

        entry.setLosses(
                entry.getLosses() + 1
        );

        pointsTableRepository.save(entry);
    }

    public void recordTie(
            PointsTable entry
    ) {

        entry.setMatchesPlayed(
                entry.getMatchesPlayed() + 1
        );

        entry.setTies(
                entry.getTies() + 1
        );

        entry.setPoints(
                entry.getPoints() + 1
        );

        pointsTableRepository.save(entry);
    }

    public void recalculateNetRunRates(Tournament tournament) {
        List<PointsTable> tableEntries = pointsTableRepository.findByTournament(tournament);

        for (PointsTable entry : tableEntries) {
            Team team = entry.getTeam();

            double totalRunsScored = 0.0;
            double totalOversFaced = 0.0;
            double totalRunsConceded = 0.0;
            double totalOversBowled = 0.0;

            List<Match> matches = matchRepository.findByTournament(tournament);
            for (Match match : matches) {
                if (match.getStatus() != com.champion_sports.backend.matches.MatchStatus.COMPLETED) {
                    continue;
                }

                if (match.getTeamA().getId().equals(team.getId()) || match.getTeamB().getId().equals(team.getId())) {
                    Innings innings1 = inningsRepository.findByMatchAndInningsNumber(match, 1).stream().findFirst().orElse(null);
                    Innings innings2 = inningsRepository.findByMatchAndInningsNumber(match, 2).stream().findFirst().orElse(null);
                    if (innings1 == null || innings2 == null) {
                        continue;
                    }

                    Innings teamInnings = null;
                    Innings opponentInnings = null;

                    if (innings1.getBattingTeam().getId().equals(team.getId())) {
                        teamInnings = innings1;
                        opponentInnings = innings2;
                    } else if (innings2.getBattingTeam().getId().equals(team.getId())) {
                        teamInnings = innings2;
                        opponentInnings = innings1;
                    }

                    if (teamInnings != null && opponentInnings != null) {
                        int teamRuns = teamInnings.getRuns() != null ? teamInnings.getRuns() : 0;
                        int teamWickets = teamInnings.getWickets() != null ? teamInnings.getWickets() : 0;
                        int teamOvers = teamInnings.getOvers() != null ? teamInnings.getOvers() : 0;
                        int teamBalls = teamInnings.getBalls() != null ? teamInnings.getBalls() : 0;

                        int oppRuns = opponentInnings.getRuns() != null ? opponentInnings.getRuns() : 0;
                        int oppWickets = opponentInnings.getWickets() != null ? opponentInnings.getWickets() : 0;
                        int oppOvers = opponentInnings.getOvers() != null ? opponentInnings.getOvers() : 0;
                        int oppBalls = opponentInnings.getBalls() != null ? opponentInnings.getBalls() : 0;

                        int matchOvers = match.getOvers() != null ? match.getOvers() : 20;

                        totalRunsScored += teamRuns;

                        if (teamWickets == 10) {
                            totalOversFaced += matchOvers;
                        } else {
                            totalOversFaced += teamOvers + (teamBalls / 6.0);
                        }

                        totalRunsConceded += oppRuns;

                        if (oppWickets == 10) {
                            totalOversBowled += matchOvers;
                        } else {
                            totalOversBowled += oppOvers + (oppBalls / 6.0);
                        }
                    }
                }
            }

            double runRateScored = totalOversFaced > 0 ? (totalRunsScored / totalOversFaced) : 0.0;
            double runRateConceded = totalOversBowled > 0 ? (totalRunsConceded / totalOversBowled) : 0.0;
            double nrr = runRateScored - runRateConceded;

            nrr = Math.round(nrr * 1000.0) / 1000.0;
            entry.setNetRunRate(nrr);
            pointsTableRepository.save(entry);
        }
    }
}