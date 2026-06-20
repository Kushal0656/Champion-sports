package com.champion_sports.backend.odds;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MatchOddsRepository extends JpaRepository<MatchOdds, Long> {
    Optional<MatchOdds> findByMatchId(Long matchId);
}
