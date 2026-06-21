package com.champion_sports.backend.innings;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.players.PlayerRepository;
import com.champion_sports.backend.websocket.ScoreUpdatePublisher;

@RestController
@RequestMapping("/api/innings")
@CrossOrigin(origins = "*")
public class InningsController {

    private final InningsRepository inningsRepository;
    private final PlayerRepository playerRepository;
    private final MatchRepository matchRepository;
    private final ScoreUpdatePublisher scoreUpdatePublisher;

    public InningsController(
            InningsRepository inningsRepository,
            PlayerRepository playerRepository,
            MatchRepository matchRepository,
            ScoreUpdatePublisher scoreUpdatePublisher
    ) {
        this.inningsRepository = inningsRepository;
        this.playerRepository = playerRepository;
        this.matchRepository = matchRepository;
        this.scoreUpdatePublisher = scoreUpdatePublisher;
    }

    @GetMapping
    public List<Innings> getAllInnings() {
        return inningsRepository.findAll();
    }

    @GetMapping("/{id}")
    public Innings getInnings(
            @PathVariable Long id
    ) {
        return inningsRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Innings not found"));
    }

    @PostMapping
    public Innings createInnings(
            @RequestBody Innings innings
    ) {
        if (innings.getMatch() != null && innings.getMatch().getId() != null) {
            Match match = matchRepository.findById(innings.getMatch().getId()).orElse(null);
            if (match != null) {
                match.setCurrentInnings(innings.getInningsNumber());
                match.setStatus(MatchStatus.LIVE);
                matchRepository.save(match);
                innings.setMatch(match);
            }
        }
        return inningsRepository.save(innings);
    }

    @PutMapping("/{id}/personnel")
    public Innings updatePersonnel(
            @PathVariable Long id,
            @RequestParam(required = false) Long strikerId,
            @RequestParam(required = false) Long nonStrikerId,
            @RequestParam(required = false) Long bowlerId
    ) {
        Innings innings = inningsRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Innings not found"));
        
        if (strikerId != null) {
            innings.setStriker(playerRepository.findById(strikerId).orElse(null));
        } else {
            innings.setStriker(null);
        }
        
        if (nonStrikerId != null) {
            innings.setNonStriker(playerRepository.findById(nonStrikerId).orElse(null));
        } else {
            innings.setNonStriker(null);
        }
        
        if (bowlerId != null) {
            innings.setCurrentBowler(playerRepository.findById(bowlerId).orElse(null));
        } else {
            innings.setCurrentBowler(null);
        }
        
        Innings saved = inningsRepository.save(innings);
        scoreUpdatePublisher.publish(saved);
        return saved;
    }
}