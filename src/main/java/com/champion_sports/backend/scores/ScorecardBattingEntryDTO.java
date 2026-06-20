package com.champion_sports.backend.scores;

public class ScorecardBattingEntryDTO {
    private Long playerId;
    private String playerName;
    private BattingStatsInnerDTO stats;

    public ScorecardBattingEntryDTO() {
    }

    public ScorecardBattingEntryDTO(Long playerId, String playerName, BattingStatsInnerDTO stats) {
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

    public BattingStatsInnerDTO getStats() {
        return stats;
    }

    public void setStats(BattingStatsInnerDTO stats) {
        this.stats = stats;
    }
}
