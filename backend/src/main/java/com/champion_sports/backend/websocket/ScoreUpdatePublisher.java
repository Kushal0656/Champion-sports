package com.champion_sports.backend.websocket;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.scores.ScorecardStateDTO;
import com.champion_sports.backend.scores.ScoringService;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ScoreUpdatePublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final ScoringService scoringService;
    private final LiveScoreWebSocketHandler webSocketHandler;

    public ScoreUpdatePublisher(
            SimpMessagingTemplate messagingTemplate,
            @Lazy ScoringService scoringService,
            LiveScoreWebSocketHandler webSocketHandler
    ) {
        this.messagingTemplate = messagingTemplate;
        this.scoringService = scoringService;
        this.webSocketHandler = webSocketHandler;
    }

    public void publish(Object scoreData) {
        messagingTemplate.convertAndSend(
                "/topic/score",
                scoreData
        );

        if (scoreData instanceof Innings) {
            Innings innings = (Innings) scoreData;
            if (innings.getMatch() != null && innings.getMatch().getId() != null) {
                Long matchId = innings.getMatch().getId();
                try {
                    ScorecardStateDTO state = scoringService.getScorecardState(matchId);
                    webSocketHandler.broadcastScore(matchId, state);
                } catch (Exception e) {
                    System.err.println("Failed to broadcast raw websocket update: " + e.getMessage());
                }
            }
        }
    }
}