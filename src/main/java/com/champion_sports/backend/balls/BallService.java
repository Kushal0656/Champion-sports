package com.champion_sports.backend.balls;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.players.Player;
import com.champion_sports.backend.players.PlayerRepository;
import com.champion_sports.backend.stats.BattingStatsService;
import com.champion_sports.backend.stats.BowlingStatsService;
import com.champion_sports.backend.websocket.ScoreUpdatePublisher;

@Service
public class BallService {

    private final BallRepository ballRepository;
    private final InningsRepository inningsRepository;
    private final PlayerRepository playerRepository;
    private final BattingStatsService battingStatsService;
    private final BowlingStatsService bowlingStatsService;
    private final ScoreUpdatePublisher scoreUpdatePublisher;

    public BallService(
            BallRepository ballRepository,
            InningsRepository inningsRepository,
            PlayerRepository playerRepository,
            BattingStatsService battingStatsService,
            BowlingStatsService bowlingStatsService,
            ScoreUpdatePublisher scoreUpdatePublisher
    ) {
        this.ballRepository = ballRepository;
        this.inningsRepository = inningsRepository;
        this.playerRepository = playerRepository;
        this.battingStatsService = battingStatsService;
        this.bowlingStatsService = bowlingStatsService;
        this.scoreUpdatePublisher = scoreUpdatePublisher;
    }

    public List<Ball> getBallsByInnings(Long inningsId) {

        Innings innings = inningsRepository.findById(inningsId)
                .orElseThrow(() -> new RuntimeException("Innings not found"));

        return ballRepository.findByInningsOrderByOverNumberAscBallNumberAsc(
                innings
        );
    }

    @Transactional
    public Ball addBall(Ball ball) {

        ball.setCreatedAt(LocalDateTime.now());

        // Load managed entities
        if (ball.getInnings() != null && ball.getInnings().getId() != null) {
            Innings innings = inningsRepository.findById(ball.getInnings().getId())
                    .orElseThrow(() -> new RuntimeException("Innings not found"));
            ball.setInnings(innings);
        }

        if (ball.getStriker() != null && ball.getStriker().getId() != null) {
            Player striker = playerRepository.findById(ball.getStriker().getId())
                    .orElseThrow(() -> new RuntimeException("Striker not found"));
            ball.setStriker(striker);
        }

        if (ball.getNonStriker() != null && ball.getNonStriker().getId() != null) {
            Player nonStriker = playerRepository.findById(ball.getNonStriker().getId())
                    .orElseThrow(() -> new RuntimeException("Non-striker not found"));
            ball.setNonStriker(nonStriker);
        }

        if (ball.getBowler() != null && ball.getBowler().getId() != null) {
            Player bowler = playerRepository.findById(ball.getBowler().getId())
                    .orElseThrow(() -> new RuntimeException("Bowler not found"));
            ball.setBowler(bowler);
        }

        updateInningsScore(ball);

        if (Boolean.TRUE.equals(ball.getWide())) {
            // Wide: batsman does not face a delivery and gets no runs
        } else if (Boolean.TRUE.equals(ball.getNoBall())) {
            // No-ball: batsman faces a delivery and gets total runs minus 1 (penalty)
            int batsmanRuns = Math.max(0, ball.getRuns() - 1);
            battingStatsService.recordRuns(
                    ball.getInnings(),
                    ball.getStriker(),
                    batsmanRuns
            );
        } else {
            // Legal delivery: batsman faces a delivery and gets total runs
            battingStatsService.recordRuns(
                    ball.getInnings(),
                    ball.getStriker(),
                    ball.getRuns()
            );
        }

        bowlingStatsService.recordBall(
                ball.getInnings(),
                ball.getBowler(),
                ball.getRuns(),
                ball.getWicket(),
                ball.getWide(),
                ball.getNoBall()
        );

        if (Boolean.TRUE.equals(ball.getWicket())) {

            battingStatsService.recordWicket(
                    ball.getInnings(),
                    ball.getStriker(),
                    ball.getWicketType()
            );
        }

        Ball savedBall = ballRepository.save(ball);

        scoreUpdatePublisher.publish(
                ball.getInnings()
        );

        return savedBall;
    }

    private void updateInningsScore(Ball ball) {

        Innings innings = ball.getInnings();

        int runs = innings.getRuns();
        int wickets = innings.getWickets();
        int balls = innings.getBalls();
        int overs = innings.getOvers();

        // Set the ball's over and ball numbers based on the CURRENT state of innings
        ball.setOverNumber(overs);
        ball.setBallNumber(balls + 1);

        runs += ball.getRuns();

        if (Boolean.TRUE.equals(ball.getWicket())) {
            wickets++;
        }

        if (!Boolean.TRUE.equals(ball.getWide())
                && !Boolean.TRUE.equals(ball.getNoBall())) {

            balls++;

            if (balls == 6) {
                overs++;
                balls = 0;
            }
        }

        innings.setRuns(runs);
        innings.setWickets(wickets);
        innings.setOvers(overs);
        innings.setBalls(balls);
        innings.setUpdatedAt(LocalDateTime.now());

        // Update active personnel state on the Innings
        Player striker = ball.getStriker();
        Player nonStriker = ball.getNonStriker();
        Player bowler = ball.getBowler();

        if (Boolean.TRUE.equals(ball.getWicket())) {
            striker = null;
        }

        int batsmanRuns = ball.getRuns();
        if (Boolean.TRUE.equals(ball.getNoBall())) {
            batsmanRuns = Math.max(0, batsmanRuns - 1);
        }
        if (!Boolean.TRUE.equals(ball.getWide()) && batsmanRuns % 2 != 0) {
            Player temp = striker;
            striker = nonStriker;
            nonStriker = temp;
        }

        if (balls == 0 && !Boolean.TRUE.equals(ball.getWide()) && !Boolean.TRUE.equals(ball.getNoBall())) {
            Player temp = striker;
            striker = nonStriker;
            nonStriker = temp;
            bowler = null; // Bowler reset at end of over
        }

        innings.setStriker(striker);
        innings.setNonStriker(nonStriker);
        innings.setCurrentBowler(bowler);

        inningsRepository.save(innings);
    }

    @Transactional
    public void undoLastBall(Long inningsId) {
        Innings innings = inningsRepository.findById(inningsId)
                .orElseThrow(() -> new RuntimeException("Innings not found"));

        Ball lastBall = ballRepository.findTopByInningsOrderByIdDesc(innings)
                .orElseThrow(() -> new RuntimeException("No balls recorded for this innings"));

        // 1. Revert Innings Score
        int runs = Math.max(0, innings.getRuns() - lastBall.getRuns());
        int wickets = innings.getWickets();
        if (Boolean.TRUE.equals(lastBall.getWicket())) {
            wickets = Math.max(0, wickets - 1);
        }

        int balls = innings.getBalls();
        int overs = innings.getOvers();
        if (!Boolean.TRUE.equals(lastBall.getWide()) && !Boolean.TRUE.equals(lastBall.getNoBall())) {
            if (balls == 0) {
                overs = Math.max(0, overs - 1);
                balls = 5;
            } else {
                balls--;
            }
        }

        innings.setRuns(runs);
        innings.setWickets(wickets);
        innings.setOvers(overs);
        innings.setBalls(balls);
        innings.setUpdatedAt(LocalDateTime.now());

        // Restore personnel to state before this ball was bowled
        innings.setStriker(lastBall.getStriker());
        innings.setNonStriker(lastBall.getNonStriker());
        innings.setCurrentBowler(lastBall.getBowler());

        inningsRepository.save(innings);

        // 2. Revert Batting Stats
        if (!Boolean.TRUE.equals(lastBall.getWide())) {
            int batsmanRuns = lastBall.getRuns();
            if (Boolean.TRUE.equals(lastBall.getNoBall())) {
                batsmanRuns = Math.max(0, batsmanRuns - 1);
            }
            battingStatsService.undoRuns(innings, lastBall.getStriker(), batsmanRuns);
        }
        if (Boolean.TRUE.equals(lastBall.getWicket())) {
            battingStatsService.undoWicket(innings, lastBall.getStriker());
        }

        // 3. Revert Bowling Stats
        bowlingStatsService.undoBall(
                innings,
                lastBall.getBowler(),
                lastBall.getRuns(),
                lastBall.getWicket(),
                lastBall.getWide(),
                lastBall.getNoBall()
        );

        // 4. Delete the Ball Record
        ballRepository.delete(lastBall);

        // 5. Publish websocket update
        scoreUpdatePublisher.publish(innings);
    }
}