package com.champion_sports.backend.scores;

public class ScorecardBowlingEntryDTO {
    private Long playerId;
    private String playerName;
    private BowlingStatsInnerDTO stats;

    public ScorecardBowlingEntryDTO() {
    }

    public ScorecardBowlingEntryDTO(Long playerId, String playerName, BowlingStatsInnerDTO stats) {
        this.playerId = playerId;
        this.playerName = playerName;
        this.stats = stats;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public BowlingStatsInnerDTO getStats() {
        return stats;
    }

    public void setStats(BowlingStatsInnerDTO stats) {
        this.stats = stats;
    }
}
