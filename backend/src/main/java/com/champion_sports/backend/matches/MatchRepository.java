package com.champion_sports.backend.matches;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.champion_sports.backend.tournaments.Tournament;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByStatus(MatchStatus status);

    long countByStatus(MatchStatus status);

    List<Match> findByTournament(Tournament tournament);

    List<Match> findByTournamentId(Long tournamentId);
}