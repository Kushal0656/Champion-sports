package com.champion_sports.backend.odds;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchRepository;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.innings.InningsRepository;
import com.champion_sports.backend.balls.Ball;
import com.champion_sports.backend.balls.BallRepository;
import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.tournaments.PointsTableRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

class HybridOddsServiceTest {

    @Mock
    private MatchRepository matchRepository;
    @Mock
    private InningsRepository inningsRepository;
    @Mock
    private BallRepository ballRepository;
    @Mock
    private PointsTableRepository pointsTableRepository;
    @Mock
    private MatchOddsRepository matchOddsRepository;

    private ObjectMapper objectMapper;
    private HybridOddsService hybridOddsService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        objectMapper = new ObjectMapper();
        hybridOddsService = new HybridOddsService(
                matchRepository,
                inningsRepository,
                ballRepository,
                pointsTableRepository,
                matchOddsRepository,
                objectMapper
        );
    }

    @Test
    void testGetLiveOddsScheduledMatch() {
        Match match = mock(Match.class);
        when(match.getId()).thenReturn(1L);
        when(match.getStatus()).thenReturn(MatchStatus.SCHEDULED);
        
        Team teamA = mock(Team.class);
        when(teamA.getId()).thenReturn(1L);
        when(teamA.getName()).thenReturn("Team A");
        
        Team teamB = mock(Team.class);
        when(teamB.getId()).thenReturn(2L);
        when(teamB.getName()).thenReturn("Team B");
        
        when(match.getTeamA()).thenReturn(teamA);
        when(match.getTeamB()).thenReturn(teamB);

        when(matchRepository.findById(1L)).thenReturn(Optional.of(match));
        when(inningsRepository.findByMatch(match)).thenReturn(Collections.emptyList());

        LiveOddsResponse response = hybridOddsService.getLiveOdds(1L);

        assertNotNull(response);
        assertEquals(50.0, response.getWin_probability());
        assertEquals(50.0, response.getOpponent_probability());
        assertEquals(2.0, response.getDecimal_odds());
        assertEquals(2.0, response.getOpponent_odds());
        assertEquals("standings_baseline", response.getSource());
    }

    @Test
    void testGetLiveOddsLiveMatchFirstInnings() {
        Match match = mock(Match.class);
        when(match.getId()).thenReturn(1L);
        when(match.getStatus()).thenReturn(MatchStatus.LIVE);
        when(match.getOversLimit()).thenReturn(20);
        
        Team teamA = mock(Team.class);
        when(teamA.getId()).thenReturn(1L);
        when(teamA.getName()).thenReturn("Team A");
        
        Team teamB = mock(Team.class);
        when(teamB.getId()).thenReturn(2L);
        when(teamB.getName()).thenReturn("Team B");
        
        when(match.getTeamA()).thenReturn(teamA);
        when(match.getTeamB()).thenReturn(teamB);

        Innings innings = mock(Innings.class);
        when(innings.getId()).thenReturn(1L);
        when(innings.getInningsNumber()).thenReturn(1);
        when(innings.getBattingTeam()).thenReturn(teamA);
        when(innings.getBowlingTeam()).thenReturn(teamB);
        when(innings.getRuns()).thenReturn(60);
        when(innings.getWickets()).thenReturn(2);
        when(innings.getOvers()).thenReturn(10);
        when(innings.getBalls()).thenReturn(0);

        when(matchRepository.findById(1L)).thenReturn(Optional.of(match));
        when(inningsRepository.findByMatch(match)).thenReturn(Arrays.asList(innings));
        when(ballRepository.findByInningsOrderByOverNumberAscBallNumberAsc(innings)).thenReturn(Collections.emptyList());

        LiveOddsResponse response = hybridOddsService.getLiveOdds(1L);

        assertNotNull(response);
        // Rule probability starts at 50
        // wickets_in_hand = 10 - 2 = 8
        // wickets_in_hand * 2 = 16
        // score = 60, overs = 10.0, CRR = 6.0
        // RRR = 0.0, pressure_index = RRR - CRR = -6.0
        // pressure_index * 3.0 = -18.0
        // ruleProbability = 50 + 16 - (-18.0) = 84.0
        assertEquals(84.0, response.getWin_probability());
        assertEquals(16.0, response.getOpponent_probability());
        assertEquals("rule_engine", response.getSource());
    }
}
