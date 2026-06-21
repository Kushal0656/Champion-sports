package com.champion_sports.backend.scores;

import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.matches.MatchResultDTO;
import com.champion_sports.backend.matches.MatchResultService;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.players.Player;
import com.champion_sports.backend.players.PlayerRepository;
import com.champion_sports.backend.stats.BattingStats;
import com.champion_sports.backend.stats.BattingStatsRepository;
import com.champion_sports.backend.stats.BowlingStats;
import com.champion_sports.backend.stats.BowlingStatsRepository;
import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.tournaments.PointsTable;
import com.champion_sports.backend.tournaments.PointsTableRepository;
import com.champion_sports.backend.tournaments.PointsTableService;
import com.champion_sports.backend.tournaments.Tournament;
import com.champion_sports.backend.websocket.LiveScoreWebSocketHandler;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ScoringService {

    private final MatchRepository matchRepository;
    private final InningsRepository inningsRepository;
    private final BallRepository ballRepository;
    private final PlayerRepository playerRepository;
    private final BattingStatsRepository battingStatsRepository;
    private final BowlingStatsRepository bowlingStatsRepository;
    private final MatchResultService matchResultService;
    private final PointsTableRepository pointsTableRepository;
    private final PointsTableService pointsTableService;
    private final LiveScoreWebSocketHandler webSocketHandler;

    public ScoringService(
            MatchRepository matchRepository,
            InningsRepository inningsRepository,
            BallRepository ballRepository,
            PlayerRepository playerRepository,
            BattingStatsRepository battingStatsRepository,
            BowlingStatsRepository bowlingStatsRepository,
            MatchResultService matchResultService,
            PointsTableRepository pointsTableRepository,
            PointsTableService pointsTableService,
            LiveScoreWebSocketHandler webSocketHandler
    ) {
        this.matchRepository = matchRepository;
        this.inningsRepository = inningsRepository;
        this.ballRepository = ballRepository;
        this.playerRepository = playerRepository;
        this.battingStatsRepository = battingStatsRepository;
        this.bowlingStatsRepository = bowlingStatsRepository;
        this.matchResultService = matchResultService;
        this.pointsTableRepository = pointsTableRepository;
        this.pointsTableService = pointsTableService;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional(readOnly = true)
    public ScorecardStateDTO getScorecardState(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        String team1Name = match.getTeamA() != null ? match.getTeamA().getName() : "Team 1";
        String team2Name = match.getTeamB() != null ? match.getTeamB().getName() : "Team 2";
        String team1Short = match.getTeamA() != null ? match.getTeamA().getShortName() : "T1";
        String team2Short = match.getTeamB() != null ? match.getTeamB().getShortName() : "T2";

        Innings innings1 = getFirstInnings(inningsRepository.findByMatchAndInningsNumber(match, 1));
        Innings innings2 = getFirstInnings(inningsRepository.findByMatchAndInningsNumber(match, 2));

        // Map batting & bowling scorecards
        List<ScorecardBattingEntryDTO> team1Batting = getBattingScorecard(innings1);
        List<ScorecardBowlingEntryDTO> team1Bowling = getBowlingScorecard(innings1);
        List<ScorecardBattingEntryDTO> team2Batting = getBattingScorecard(innings2);
        List<ScorecardBowlingEntryDTO> team2Bowling = getBowlingScorecard(innings2);

        // Live Info calculation
        LiveInfoDTO liveInfo = null;
        if (match.getStatus() == MatchStatus.LIVE) {
            liveInfo = calculateLiveInfo(match, innings1, innings2);
        }

        // Ball history
        List<Innings> matchInnings = new ArrayList<>();
        if (innings1 != null) matchInnings.add(innings1);
        if (innings2 != null) matchInnings.add(innings2);

        List<BallHistoryDTO> ballHistory = new ArrayList<>();
        if (!matchInnings.isEmpty()) {
            List<Ball> balls = ballRepository.findByInningsInOrderByIdAsc(matchInnings);
            ballHistory = balls.stream().map(b -> {
                BallEventDTO event = new BallEventDTO(
                        b.getId(),
                        b.getOverNumber(),
                        b.getBallNumber(),
                        b.getWicket(),
                        b.getWide() ? "WIDE" : b.getNoBall() ? "NO_BALL" : b.getBye() ? "BYE" : b.getLegBye() ? "LEG_BYE" : "NONE",
                        (b.getWide() || b.getNoBall()) ? 1 : (b.getBye() || b.getLegBye()) ? b.getRuns() : 0,
                        (b.getWide() || b.getBye() || b.getLegBye()) ? 0 : b.getNoBall() ? Math.max(0, b.getRuns() - 1) : b.getRuns(),
                        b.getWicket() ? b.getWicketType() : "NONE",
                        b.getCommentary()
                );
                return new BallHistoryDTO(event, b.getStriker().getName(), b.getBowler().getName());
            }).collect(Collectors.toList());
        }

        ScorecardStateDTO state = new ScorecardStateDTO();
        state.setMatch(match);
        state.setTeam1Name(team1Name);
        state.setTeam2Name(team2Name);
        state.setTeam1Short(team1Short);
        state.setTeam2Short(team2Short);
        state.setInnings1(innings1);
        state.setInnings2(innings2);
        state.setLiveInfo(liveInfo);
        state.setTeam1BattingScorecard(team1Batting);
        state.setTeam1BowlingScorecard(team1Bowling);
        state.setTeam2BattingScorecard(team2Batting);
        state.setTeam2BowlingScorecard(team2Bowling);
        state.setBallHistory(ballHistory);

        return state;
    }

    /** Returns the first innings from a list (null-safe) - prevents NonUniqueResultException if duplicates exist */
    private Innings getFirstInnings(List<Innings> list) {
        return list.isEmpty() ? null : list.get(0);
    }

    private List<ScorecardBattingEntryDTO> getBattingScorecard(Innings innings) {
        if (innings == null) return Collections.emptyList();
        List<BattingStats> statsList = battingStatsRepository.findByInnings(innings);
        return statsList.stream().map(s -> new ScorecardBattingEntryDTO(
                s.getPlayer().getId(),
                s.getPlayer().getName(),
                new BattingStatsInnerDTO(
                        s.getOut(),
                        s.getOut() ? (s.getDismissalType() != null ? s.getDismissalType().toLowerCase().replace("_", " ") : "out") : "not out",
                        s.getRuns(),
                        s.getBalls(),
                        s.getFours(),
                        s.getSixes()
                )
        )).collect(Collectors.toList());
    }

    private List<ScorecardBowlingEntryDTO> getBowlingScorecard(Innings innings) {
        if (innings == null) return Collections.emptyList();
        List<BowlingStats> statsList = bowlingStatsRepository.findByInnings(innings);
        return statsList.stream().map(s -> new ScorecardBowlingEntryDTO(
                s.getPlayer().getId(),
                s.getPlayer().getName(),
                new BowlingStatsInnerDTO(
                        s.getOvers() + (s.getBalls() / 6.0),
                        s.getMaidens(),
                        s.getRunsConceded(),
                        s.getWickets()
                )
        )).collect(Collectors.toList());
    }

    private LiveInfoDTO calculateLiveInfo(Match match, Innings innings1, Innings innings2) {
        Innings activeInn = match.getCurrentInnings() == 2 ? innings2 : innings1;
        if (activeInn == null) return null;

        Player striker = activeInn.getStriker();
        Player nonStriker = activeInn.getNonStriker();
        Player bowler = activeInn.getCurrentBowler();

        LiveInfoDTO info = new LiveInfoDTO();
        if (striker != null) {
            info.setStrikerId(striker.getId());
            info.setStrikerName(striker.getName());
            BattingStats sStats = battingStatsRepository.findByInningsAndPlayer(activeInn, striker).stream().findFirst().orElse(null);
            info.setStrikerStats(sStats != null ? new PlayerStatsDTO(sStats.getRuns(), sStats.getBalls(), sStats.getFours(), sStats.getSixes()) : new PlayerStatsDTO(0, 0, 0, 0));
        }

        if (nonStriker != null) {
            info.setNonStrikerId(nonStriker.getId());
            info.setNonStrikerName(nonStriker.getName());
            BattingStats nsStats = battingStatsRepository.findByInningsAndPlayer(activeInn, nonStriker).stream().findFirst().orElse(null);
            info.setNonStrikerStats(nsStats != null ? new PlayerStatsDTO(nsStats.getRuns(), nsStats.getBalls(), nsStats.getFours(), nsStats.getSixes()) : new PlayerStatsDTO(0, 0, 0, 0));
        }

        if (bowler != null) {
            info.setBowlerId(bowler.getId());
            info.setBowlerName(bowler.getName());
            BowlingStats bStats = bowlingStatsRepository.findByInningsAndPlayer(activeInn, bowler).stream().findFirst().orElse(null);
            info.setBowlerStats(bStats != null ? new BowlerStatsDTO(bStats.getOvers() + (bStats.getBalls() / 6.0), bStats.getMaidens(), bStats.getRunsConceded(), bStats.getWickets()) : new BowlerStatsDTO(0.0, 0, 0, 0));
        }

        // Last over balls
        List<Ball> overBalls = ballRepository.findByInningsOrderByOverNumberAscBallNumberAsc(activeInn);
        int currentOverNum = activeInn.getOvers();
        List<String> lastOverStrings = overBalls.stream()
                .filter(b -> b.getOverNumber() == currentOverNum)
                .map(b -> {
                    if (b.getWicket()) return "W";
                    if (b.getWide()) return b.getRuns() > 1 ? b.getRuns() + "Wd" : "Wd";
                    if (b.getNoBall()) return b.getRuns() > 1 ? b.getRuns() + "Nb" : "Nb";
                    if (b.getBye()) return b.getRuns() + "B";
                    if (b.getLegBye()) return b.getRuns() + "Lb";
                    return String.valueOf(b.getRuns());
                }).collect(Collectors.toList());
        info.setLastOverBalls(lastOverStrings);

        return info;
    }

    @Transactional
    public ScorecardStateDTO rebuildMatch(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        // Delete all balls
        List<Innings> inningsList = inningsRepository.findByMatch(match);
        for (Innings inn : inningsList) {
            List<Ball> balls = ballRepository.findByInnings(inn);
            ballRepository.deleteAll(balls);
            
            // Delete stats
            List<BattingStats> bStats = battingStatsRepository.findByInnings(inn);
            battingStatsRepository.deleteAll(bStats);

            List<BowlingStats> boStats = bowlingStatsRepository.findByInnings(inn);
            bowlingStatsRepository.deleteAll(boStats);
        }

        // Delete innings 2 (and any duplicates)
        inningsRepository.findByMatchAndInningsNumber(match, 2).forEach(inningsRepository::delete);

        // Reset Innings 1 (dedup and reuse or create)
        List<Innings> innings1List = inningsRepository.findByMatchAndInningsNumber(match, 1);
        Innings innings1;
        if (innings1List.isEmpty()) {
            innings1 = new Innings();
            innings1.setMatch(match);
            innings1.setInningsNumber(1);
        } else {
            innings1 = innings1List.get(0);
            // Delete any duplicate innings 1 records
            for (int i = 1; i < innings1List.size(); i++) {
                inningsRepository.delete(innings1List.get(i));
            }
        }

        // Determine batting/bowling team based on toss
        Team battingTeam;
        Team bowlingTeam;
        Long tossWinnerId = match.getTossWinnerId();
        String decision = match.getTossDecision();

        if (tossWinnerId != null && decision != null) {
            if ("BAT".equalsIgnoreCase(decision)) {
                if (match.getTeamA().getId().equals(tossWinnerId)) {
                    battingTeam = match.getTeamA();
                    bowlingTeam = match.getTeamB();
                } else {
                    battingTeam = match.getTeamB();
                    bowlingTeam = match.getTeamA();
                }
            } else {
                if (match.getTeamA().getId().equals(tossWinnerId)) {
                    battingTeam = match.getTeamB();
                    bowlingTeam = match.getTeamA();
                } else {
                    battingTeam = match.getTeamA();
                    bowlingTeam = match.getTeamB();
                }
            }
            innings1.setBattingTeam(battingTeam);
            innings1.setBowlingTeam(bowlingTeam);
        }

        innings1.setRuns(0);
        innings1.setWickets(0);
        innings1.setOvers(0);
        innings1.setBalls(0);
        innings1.setCompleted(false);
        
        if (match.getCurrentStrikerId() != null) {
            innings1.setStriker(playerRepository.findById(match.getCurrentStrikerId()).orElse(null));
        }
        if (match.getCurrentNonStrikerId() != null) {
            innings1.setNonStriker(playerRepository.findById(match.getCurrentNonStrikerId()).orElse(null));
        }
        if (match.getCurrentBowlerId() != null) {
            innings1.setCurrentBowler(playerRepository.findById(match.getCurrentBowlerId()).orElse(null));
        }

        innings1.setCreatedAt(LocalDateTime.now());
        innings1.setUpdatedAt(LocalDateTime.now());
        inningsRepository.save(innings1);

        match.setCurrentInnings(1);
        match.setStatus(MatchStatus.LIVE);
        match.setWinner(null);
        match.setResultMargin(null);
        matchRepository.save(match);

        rebuildPointsTable(match.getTournament());

        ScorecardStateDTO state = getScorecardState(matchId);
        webSocketHandler.broadcastScore(matchId, state);
        return state;
    }

    @Transactional
    public ScorecardStateDTO addBall(Long matchId, BallInputDTO input) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        List<Innings> activeInnList = inningsRepository.findByMatchAndInningsNumber(match, match.getCurrentInnings());
        if (activeInnList.isEmpty()) throw new RuntimeException("Active innings not found");
        Innings activeInn = activeInnList.get(0);
        // Clean up any duplicate innings records
        for (int i = 1; i < activeInnList.size(); i++) {
            inningsRepository.delete(activeInnList.get(i));
        }

        Player striker = playerRepository.findById(input.getBatsmanId())
                .orElseThrow(() -> new RuntimeException("Striker not found"));
        Player nonStriker = playerRepository.findById(input.getNonStrikerId())
                .orElseThrow(() -> new RuntimeException("Non-striker not found"));
        Player bowler = playerRepository.findById(input.getBowlerId())
                .orElseThrow(() -> new RuntimeException("Bowler not found"));

        // Save new Ball
        Ball ball = new Ball();
        ball.setInnings(activeInn);
        ball.setOverNumber(activeInn.getOvers());
        ball.setBallNumber(activeInn.getBalls());
        ball.setStriker(striker);
        ball.setNonStriker(nonStriker);
        ball.setBowler(bowler);
        ball.setRuns(input.getBatsmanRuns() + input.getExtraRuns());
        ball.setWicket(input.getWicket());
        ball.setWicketType(input.getWicketType());
        if (input.getWicket() && input.getDismissedPlayerId() != null) {
            ball.setDismissedPlayer(playerRepository.findById(input.getDismissedPlayerId()).orElse(null));
        }
        ball.setWide("WIDE".equalsIgnoreCase(input.getExtraType()));
        ball.setNoBall("NO_BALL".equalsIgnoreCase(input.getExtraType()));
        ball.setBye("BYE".equalsIgnoreCase(input.getExtraType()));
        ball.setLegBye("LEG_BYE".equalsIgnoreCase(input.getExtraType()));
        ball.setCommentary(input.getCommentary());
        ball.setCreatedAt(LocalDateTime.now());
        ballRepository.save(ball);

        // Recalculate
        recalculateMatchState(match);

        ScorecardStateDTO state = getScorecardState(matchId);
        webSocketHandler.broadcastScore(matchId, state);
        return state;
    }

    @Transactional
    public ScorecardStateDTO undoLastBall(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));

        List<Innings> inningsList = inningsRepository.findByMatch(match);
        if (inningsList.isEmpty()) return getScorecardState(matchId);

        List<Ball> balls = ballRepository.findByInningsInOrderByIdAsc(inningsList);
        if (balls.isEmpty()) return getScorecardState(matchId);

        // Delete last ball
        Ball lastBall = balls.get(balls.size() - 1);
        ballRepository.delete(lastBall);

        // Recalculate
        recalculateMatchState(match);

        ScorecardStateDTO state = getScorecardState(matchId);
        webSocketHandler.broadcastScore(matchId, state);
        return state;
    }

    private void recalculateMatchState(Match match) {
        List<Innings> inningsList = inningsRepository.findByMatch(match);

        // Delete all stats first
        for (Innings inn : inningsList) {
            battingStatsRepository.deleteAll(battingStatsRepository.findByInnings(inn));
            bowlingStatsRepository.deleteAll(bowlingStatsRepository.findByInnings(inn));

            // Reset Innings scores
            inn.setRuns(0);
            inn.setWickets(0);
            inn.setOvers(0);
            inn.setBalls(0);
            inn.setCompleted(false);
            inningsRepository.save(inn);
        }

        // We will query all balls sorted by ID.
        List<Ball> balls = ballRepository.findByInningsInOrderByIdAsc(inningsList);

        // Initialize state to initial coin toss setup
        match.setCurrentInnings(1);
        match.setStatus(MatchStatus.LIVE);
        match.setWinner(null);
        match.setResultMargin(null);
        matchRepository.save(match);

        Innings innings1 = getFirstInnings(inningsRepository.findByMatchAndInningsNumber(match, 1));
        Innings innings2 = getFirstInnings(inningsRepository.findByMatchAndInningsNumber(match, 2));

        Long currentStrikerId = match.getCurrentStrikerId();
        Long currentNonStrikerId = match.getCurrentNonStrikerId();
        Long currentBowlerId = match.getCurrentBowlerId();

        for (Ball ball : balls) {
            Innings ballInn = ball.getInnings();
            int currentInnNum = ballInn.getInningsNumber();
            match.setCurrentInnings(currentInnNum);

            // Replay ball stats
            // 1. Update Innings score
            ballInn.setRuns(ballInn.getRuns() + ball.getRuns());
            if (ball.getWicket()) {
                ballInn.setWickets(ballInn.getWickets() + 1);
            }
            boolean isExtraBall = ball.getWide() || ball.getNoBall();
            if (!isExtraBall) {
                int bNum = ballInn.getBalls() + 1;
                if (bNum == 6) {
                    ballInn.setOvers(ballInn.getOvers() + 1);
                    ballInn.setBalls(0);
                } else {
                    ballInn.setBalls(bNum);
                }
            }
            inningsRepository.save(ballInn);

            // 2. Batting Stats
            Player striker = ball.getStriker();
            List<BattingStats> strikerList = battingStatsRepository.findByInningsAndPlayer(ballInn, striker);
            BattingStats bs;
            if (strikerList.isEmpty()) {
                bs = new BattingStats();
                bs.setInnings(ballInn);
                bs.setPlayer(striker);
            } else {
                bs = strikerList.get(0);
                if (strikerList.size() > 1) {
                    for (int i = 1; i < strikerList.size(); i++) {
                        battingStatsRepository.delete(strikerList.get(i));
                    }
                }
            }
            int batRuns = 0;
            if (ball.getWide()) {
                batRuns = 0;
            } else if (ball.getBye() || ball.getLegBye()) {
                batRuns = 0;
            } else if (ball.getNoBall()) {
                batRuns = Math.max(0, ball.getRuns() - 1);
            } else {
                batRuns = ball.getRuns();
            }

            bs.setRuns(bs.getRuns() + batRuns);
            if (!ball.getWide()) {
                bs.setBalls(bs.getBalls() + 1);
            }
            if (batRuns == 4) {
                bs.setFours(bs.getFours() + 1);
            } else if (batRuns == 6) {
                bs.setSixes(bs.getSixes() + 1);
            }
            if (ball.getWicket() && ball.getDismissedPlayer() != null && ball.getDismissedPlayer().getId().equals(striker.getId())) {
                bs.setOut(true);
                bs.setDismissalType(ball.getWicketType());
            }
            battingStatsRepository.save(bs);

            // If non-striker was dismissed
            Player nonStriker = ball.getNonStriker();
            if (ball.getWicket() && ball.getDismissedPlayer() != null && ball.getDismissedPlayer().getId().equals(nonStriker.getId())) {
                List<BattingStats> nonStrikerList = battingStatsRepository.findByInningsAndPlayer(ballInn, nonStriker);
                BattingStats nsBs;
                if (nonStrikerList.isEmpty()) {
                    nsBs = new BattingStats();
                    nsBs.setInnings(ballInn);
                    nsBs.setPlayer(nonStriker);
                } else {
                    nsBs = nonStrikerList.get(0);
                    if (nonStrikerList.size() > 1) {
                        for (int i = 1; i < nonStrikerList.size(); i++) {
                            battingStatsRepository.delete(nonStrikerList.get(i));
                        }
                    }
                }
                nsBs.setOut(true);
                nsBs.setDismissalType(ball.getWicketType());
                battingStatsRepository.save(nsBs);
            }

            // 3. Bowling Stats
            Player bowler = ball.getBowler();
            List<BowlingStats> bowlerList = bowlingStatsRepository.findByInningsAndPlayer(ballInn, bowler);
            BowlingStats boStats;
            if (bowlerList.isEmpty()) {
                boStats = new BowlingStats();
                boStats.setInnings(ballInn);
                boStats.setPlayer(bowler);
            } else {
                boStats = bowlerList.get(0);
                if (bowlerList.size() > 1) {
                    for (int i = 1; i < bowlerList.size(); i++) {
                        bowlingStatsRepository.delete(bowlerList.get(i));
                    }
                }
            }

            int bowlConceded = 0;
            if (ball.getWide() || ball.getNoBall()) {
                bowlConceded = ball.getRuns();
            } else if (ball.getBye() || ball.getLegBye()) {
                bowlConceded = 0;
            } else {
                bowlConceded = ball.getRuns();
            }
            boStats.setRunsConceded(boStats.getRunsConceded() + bowlConceded);

            if (!isExtraBall) {
                int bowBalls = boStats.getBalls() + 1;
                if (bowBalls == 6) {
                    boStats.setOvers(boStats.getOvers() + 1);
                    boStats.setBalls(0);
                } else {
                    boStats.setBalls(bowBalls);
                }
            }

            if (ball.getWicket() && !"RUN_OUT".equalsIgnoreCase(ball.getWicketType()) && !"RETIRED".equalsIgnoreCase(ball.getWicketType())) {
                boStats.setWickets(boStats.getWickets() + 1);
            }
            bowlingStatsRepository.save(boStats);

            // 4. Update striker/non-striker/bowler rotation details
            currentStrikerId = ball.getStriker().getId();
            currentNonStrikerId = ball.getNonStriker().getId();
            currentBowlerId = ball.getBowler().getId();

            if (ball.getWicket() && ball.getDismissedPlayer() != null) {
                if (ball.getDismissedPlayer().getId().equals(currentStrikerId)) {
                    currentStrikerId = null;
                } else if (ball.getDismissedPlayer().getId().equals(currentNonStrikerId)) {
                    currentNonStrikerId = null;
                }
            }

            // Odd runs rotate strike
            int runForRotation = 0;
            if (ball.getBye() || ball.getLegBye()) {
                runForRotation = ball.getRuns();
            } else if (!ball.getWide()) {
                runForRotation = batRuns;
            }
            if (runForRotation % 2 != 0) {
                Long temp = currentStrikerId;
                currentStrikerId = currentNonStrikerId;
                currentNonStrikerId = temp;
            }

            // Over completed rotates strike and resets bowler
            if (!isExtraBall && ballInn.getBalls() == 0) {
                Long temp = currentStrikerId;
                currentStrikerId = currentNonStrikerId;
                currentNonStrikerId = temp;
                currentBowlerId = null; // Scorer needs to assign new bowler
            }

            ballInn.setStriker(currentStrikerId != null ? playerRepository.findById(currentStrikerId).orElse(null) : null);
            ballInn.setNonStriker(currentNonStrikerId != null ? playerRepository.findById(currentNonStrikerId).orElse(null) : null);
            ballInn.setCurrentBowler(currentBowlerId != null ? playerRepository.findById(currentBowlerId).orElse(null) : null);
            inningsRepository.save(ballInn);

            // Innings completion checks
            boolean innCompleted = ballInn.getWickets() == 10 || ballInn.getOvers().equals(match.getOversLimit());
            
            // For Innings 2, target check completes innings
            if (currentInnNum == 2 && innings1 != null) {
                if (ballInn.getRuns() > innings1.getRuns()) {
                    innCompleted = true;
                }
            }

            if (innCompleted) {
                ballInn.setCompleted(true);
                inningsRepository.save(ballInn);

                if (currentInnNum == 1) {
                    match.setCurrentInnings(2);
                    // Create innings 2 if not present
                    if (innings2 == null) {
                        Innings newInn = new Innings();
                        newInn.setMatch(match);
                        newInn.setInningsNumber(2);
                        newInn.setBattingTeam(innings1.getBowlingTeam());
                        newInn.setBowlingTeam(innings1.getBattingTeam());
                        newInn.setRuns(0);
                        newInn.setWickets(0);
                        newInn.setOvers(0);
                        newInn.setBalls(0);
                        newInn.setCompleted(false);
                        newInn.setCreatedAt(LocalDateTime.now());
                        newInn.setUpdatedAt(LocalDateTime.now());
                        innings2 = inningsRepository.save(newInn);
                    }
                    currentStrikerId = null;
                    currentNonStrikerId = null;
                    currentBowlerId = null;
                } else {
                    // Match completed
                    match.setStatus(MatchStatus.COMPLETED);
                    matchRepository.save(match);
                }
            }
        }

        // Save final live state to match entity
        match.setCurrentStrikerId(currentStrikerId);
        match.setCurrentNonStrikerId(currentNonStrikerId);
        match.setCurrentBowlerId(currentBowlerId);
        matchRepository.save(match);

        if (match.getStatus() == MatchStatus.COMPLETED) {
            matchResultService.completeMatch(match.getId());
        }

        rebuildPointsTable(match.getTournament());
    }

    public void rebuildPointsTable(Tournament tournament) {
        if (tournament == null) return;

        List<PointsTable> entries = pointsTableRepository.findByTournament(tournament);
        for (PointsTable entry : entries) {
            entry.setMatchesPlayed(0);
            entry.setWins(0);
            entry.setLosses(0);
            entry.setTies(0);
            entry.setPoints(0);
            entry.setNetRunRate(0.0);
            pointsTableRepository.save(entry);
        }

        List<Match> completedMatches = matchRepository.findByTournament(tournament).stream()
                .filter(m -> m.getStatus() == MatchStatus.COMPLETED)
                .collect(Collectors.toList());

        for (Match m : completedMatches) {
            try {
                MatchResultDTO result = matchResultService.getResult(m);
                PointsTable teamA = pointsTableService.createEntry(tournament, m.getTeamA());
                PointsTable teamB = pointsTableService.createEntry(tournament, m.getTeamB());

                if ("TIE".equalsIgnoreCase(result.getWinner())) {
                    teamA.setMatchesPlayed(teamA.getMatchesPlayed() + 1);
                    teamA.setTies(teamA.getTies() + 1);
                    teamA.setPoints(teamA.getPoints() + 1);

                    teamB.setMatchesPlayed(teamB.getMatchesPlayed() + 1);
                    teamB.setTies(teamB.getTies() + 1);
                    teamB.setPoints(teamB.getPoints() + 1);
                } else if (m.getTeamA().getName().equalsIgnoreCase(result.getWinner())) {
                    teamA.setMatchesPlayed(teamA.getMatchesPlayed() + 1);
                    teamA.setWins(teamA.getWins() + 1);
                    teamA.setPoints(teamA.getPoints() + 2);

                    teamB.setMatchesPlayed(teamB.getMatchesPlayed() + 1);
                    teamB.setLosses(teamB.getLosses() + 1);
                } else {
                    teamB.setMatchesPlayed(teamB.getMatchesPlayed() + 1);
                    teamB.setWins(teamB.getWins() + 1);
                    teamB.setPoints(teamB.getPoints() + 2);

                    teamA.setMatchesPlayed(teamA.getMatchesPlayed() + 1);
                    teamA.setLosses(teamA.getLosses() + 1);
                }
                pointsTableRepository.save(teamA);
                pointsTableRepository.save(teamB);
            } catch (Exception e) {
                // Match not completed or result error, skip
            }
        }
        pointsTableService.recalculateNetRunRates(tournament);
    }
}
