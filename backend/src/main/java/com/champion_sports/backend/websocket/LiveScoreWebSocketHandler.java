package com.champion_sports.backend.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class LiveScoreWebSocketHandler extends TextWebSocketHandler {

    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper;

    public LiveScoreWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessions.remove(session);
        if (session.isOpen()) {
            session.close();
        }
    }

    public void broadcastScore(Long matchId, Object scorecard) {
        broadcast(matchId, "SCORE_UPDATE", scorecard);
    }

    public void broadcastOverlay(Long matchId, Object overlayState) {
        broadcast(matchId, "OVERLAY_UPDATE", overlayState);
    }

    private void broadcast(Long matchId, String type, Object data) {
        Map<String, Object> payload = Map.of(
                "matchId", String.valueOf(matchId),
                "type", type,
                "data", data
        );

        try {
            String json = objectMapper.writeValueAsString(payload);
            TextMessage message = new TextMessage(json);
            
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                    } catch (IOException e) {
                        // Clean up closed session
                        sessions.remove(session);
                    }
                }
            }
        } catch (IOException e) {
            System.err.println("Failed to serialize WebSocket payload: " + e.getMessage());
        }
    }
}
