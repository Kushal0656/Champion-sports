package com.champion_sports.backend.dashboard;

import org.springframework.stereotype.Service;

import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.players.PlayerRepository;
import com.champion_sports.backend.teams.TeamRepository;
import com.champion_sports.backend.tournaments.TournamentRepository;

@Service
public class DashboardService {

    private final TeamRepository teamRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final TournamentRepository tournamentRepository;

    public DashboardService(
            TeamRepository teamRepository,
            PlayerRepository playerRepository,
            MatchRepository matchRepository,
            TournamentRepository tournamentRepository
    ) {
        this.teamRepository = teamRepository;
        this.playerRepository = playerRepository;
        this.matchRepository = matchRepository;
        this.tournamentRepository = tournamentRepository;
    }

    public DashboardDTO getDashboard() {

        DashboardDTO dto =
                new DashboardDTO();

        dto.setTotalTeams(
                teamRepository.count()
        );

        dto.setTotalPlayers(
                playerRepository.count()
        );

        dto.setTotalMatches(
                matchRepository.count()
        );

        dto.setTotalTournaments(
                tournamentRepository.count()
        );

        return dto;
    }
}