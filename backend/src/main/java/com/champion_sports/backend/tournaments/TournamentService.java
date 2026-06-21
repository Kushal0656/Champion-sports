package com.champion_sports.backend.tournaments;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class TournamentService {

    private final TournamentRepository tournamentRepository;

    public TournamentService(
            TournamentRepository tournamentRepository
    ) {
        this.tournamentRepository = tournamentRepository;
    }

    public List<Tournament> getAllTournaments() {
        return tournamentRepository.findAll();
    }

    public Tournament getTournamentById(
            Long id
    ) {
        return tournamentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Tournament not found"
                        ));
    }

    public Tournament createTournament(
            Tournament tournament
    ) {
        return tournamentRepository.save(
                tournament
        );
    }
}