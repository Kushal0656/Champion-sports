package com.champion_sports.backend.balls;

import com.champion_sports.backend.innings.Innings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BallRepository extends JpaRepository<Ball, Long> {

    List<Ball> findByInnings(Innings innings);

    List<Ball> findByInningsOrderByOverNumberAscBallNumberAsc(
            Innings innings
    );

    List<Ball> findByInningsInOrderByIdAsc(List<Innings> inningsList);

    Optional<Ball> findTopByInningsOrderByIdDesc(Innings innings);
}