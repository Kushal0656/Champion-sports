package com.champion_sports.backend.scores;

public class BowlingStatsInnerDTO {
    private Double oversBowled;
    private Integer maidens;
    private Integer runsConceded;
    private Integer wicketsTaken;

    public BowlingStatsInnerDTO() {
    }

    public BowlingStatsInnerDTO(Double oversBowled, Integer maidens, Integer runsConceded, Integer wicketsTaken) {
        this.oversBowled = oversBowled;
        this.maidens = maidens;
        this.runsConceded = runsConceded;
        this.wicketsTaken = wicketsTaken;
    }

    public Double getOversBowled() {
        return oversBowled;
    }

    public void setOversBowled(Double oversBowled) {
        this.oversBowled = oversBowled;
    }

    public Integer getMaidens() {
        return maidens;
    }

    public void setMaidens(Integer maidens) {
        this.maidens = maidens;
    }

    public Integer getRunsConceded() {
        return runsConceded;
    }

    public void setRunsConceded(Integer runsConceded) {
        this.runsConceded = runsConceded;
    }

    public Integer getWicketsTaken() {
        return wicketsTaken;
    }

    public void setWicketsTaken(Integer wicketsTaken) {
        this.wicketsTaken = wicketsTaken;
    }
}
