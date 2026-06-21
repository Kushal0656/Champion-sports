package com.champion_sports.backend.innings;

import com.champion_sports.backend.matches.Match;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InningsRepository extends JpaRepository<Innings, Long> {

    List<Innings> findByMatch(Match match);

    List<Innings> findByMatchAndInningsNumber(
            Match match,
            Integer inningsNumber
    );
}