package com.champion_sports.backend.scores;

import java.util.List;

public class LiveInfoDTO {
    private String strikerName;
    private Long strikerId;
    private PlayerStatsDTO strikerStats;

    private String nonStrikerName;
    private Long nonStrikerId;
    private PlayerStatsDTO nonStrikerStats;

    private String bowlerName;
    private Long bowlerId;
    private BowlerStatsDTO bowlerStats;

    private List<String> lastOverBalls;

    public LiveInfoDTO() {
    }

    public String getStrikerName() {
        return strikerName;
    }

    public void setStrikerName(String strikerName) {
        this.strikerName = strikerName;
    }

    public Long getStrikerId() {
        return strikerId;
    }

    public void setStrikerId(Long strikerId) {
        this.strikerId = strikerId;
    }

    public PlayerStatsDTO getStrikerStats() {
        return strikerStats;
    }

    public void setStrikerStats(PlayerStatsDTO strikerStats) {
        this.strikerStats = strikerStats;
    }

    public String getNonStrikerName() {
        return nonStrikerName;
    }

    public void setNonStrikerName(String nonStrikerName) {
        this.nonStrikerName = nonStrikerName;
    }

    public Long getNonStrikerId() {
        return nonStrikerId;
    }

    public void setNonStrikerId(Long nonStrikerId) {
        this.nonStrikerId = nonStrikerId;
    }

    public PlayerStatsDTO getNonStrikerStats() {
        return nonStrikerStats;
    }

    public void setNonStrikerStats(PlayerStatsDTO nonStrikerStats) {
        this.nonStrikerStats = nonStrikerStats;
    }

    public String getBowlerName() {
        return bowlerName;
    }

    public void setBowlerName(String bowlerName) {
        this.bowlerName = bowlerName;
    }

    public Long getBowlerId() {
        return bowlerId;
    }

    public void setBowlerId(Long bowlerId) {
        this.bowlerId = bowlerId;
    }

    public BowlerStatsDTO getBowlerStats() {
        return bowlerStats;
    }

    public void setBowlerStats(BowlerStatsDTO bowlerStats) {
        this.bowlerStats = bowlerStats;
    }

    public List<String> getLastOverBalls() {
        return lastOverBalls;
    }

    public void setLastOverBalls(List<String> lastOverBalls) {
        this.lastOverBalls = lastOverBalls;
    }
}
