package com.champion_sports.backend.sessions;

import java.time.LocalDateTime;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "cricket_sessions")
public class CricketSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long matchId;

    private String sessionName;

    private Integer runLine;

    private Double overOdds;

    private Double underOdds;

    private String status = "OPEN"; // OPEN, SUSPENDED, DECLARED

    private Integer result; // Declared result/runs

    private LocalDateTime updatedAt = LocalDateTime.now();

    public CricketSession() {
    }

    public CricketSession(Long matchId, String sessionName, Integer runLine, Double overOdds, Double underOdds) {
        this.matchId = matchId;
        this.sessionName = sessionName;
        this.runLine = runLine;
        this.overOdds = overOdds;
        this.underOdds = underOdds;
        this.status = "OPEN";
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public String getSessionName() {
        return sessionName;
    }

    public void setSessionName(String sessionName) {
        this.sessionName = sessionName;
    }

    public Integer getRunLine() {
        return runLine;
    }

    public void setRunLine(Integer runLine) {
        this.runLine = runLine;
    }

    public Double getOverOdds() {
        return overOdds;
    }

    public void setOverOdds(Double overOdds) {
        this.overOdds = overOdds;
    }

    public Double getUnderOdds() {
        return underOdds;
    }

    public void setUnderOdds(Double underOdds) {
        this.underOdds = underOdds;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getResult() {
        return result;
    }

    public void setResult(Integer result) {
        this.result = result;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
