package com.champion_sports.backend.matches;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class MatchService {

    private final MatchRepository matchRepository;

    public MatchService(MatchRepository matchRepository) {
        this.matchRepository = matchRepository;
    }

    public List<Match> getAllMatches() {
        return matchRepository.findAll();
    }

    public List<Match> getMatchesByTournamentId(Long tournamentId) {
        return matchRepository.findByTournamentId(tournamentId);
    }

    public Match getMatchById(Long id) {
        return matchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Match not found"));
    }

    public Match createMatch(Match match) {

        match.setCreatedAt(LocalDateTime.now());
        match.setUpdatedAt(LocalDateTime.now());

        if (match.getStatus() == null) {
            match.setStatus(MatchStatus.SCHEDULED);
        }

        return matchRepository.save(match);
    }

    public Match updateMatch(Long id, Match updatedMatch) {

        Match existingMatch = getMatchById(id);

        existingMatch.setTeamA(updatedMatch.getTeamA());
        existingMatch.setTeamB(updatedMatch.getTeamB());
        existingMatch.setTournament(updatedMatch.getTournament());
        existingMatch.setVenue(updatedMatch.getVenue());
        existingMatch.setMatchDate(updatedMatch.getMatchDate());
        existingMatch.setStatus(updatedMatch.getStatus());
        existingMatch.setTossWinner(updatedMatch.getTossWinner());
        existingMatch.setTossDecision(updatedMatch.getTossDecision());
        existingMatch.setWinner(updatedMatch.getWinner());
        existingMatch.setResultMargin(updatedMatch.getResultMargin());
        existingMatch.setOvers(updatedMatch.getOvers());
        existingMatch.setStreamUrl(updatedMatch.getStreamUrl());

        // Live scoring fields
        if (updatedMatch.getCurrentStrikerId() != null) {
            existingMatch.setCurrentStrikerId(updatedMatch.getCurrentStrikerId());
        }
        if (updatedMatch.getCurrentNonStrikerId() != null) {
            existingMatch.setCurrentNonStrikerId(updatedMatch.getCurrentNonStrikerId());
        }
        if (updatedMatch.getCurrentBowlerId() != null) {
            existingMatch.setCurrentBowlerId(updatedMatch.getCurrentBowlerId());
        }

        existingMatch.setUpdatedAt(LocalDateTime.now());

        return matchRepository.save(existingMatch);
    }

    public void deleteMatch(Long id) {
        matchRepository.deleteById(id);
    }
}