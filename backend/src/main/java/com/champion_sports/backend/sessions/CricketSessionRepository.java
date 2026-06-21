package com.champion_sports.backend.sessions;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CricketSessionRepository extends JpaRepository<CricketSession, Long> {
    List<CricketSession> findByMatchId(Long matchId);
}
