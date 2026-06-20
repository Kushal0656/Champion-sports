package com.champion_sports.backend.scores;

public class BowlerStatsDTO {
    private Double oversBowled = 0.0;
    private Integer maidens = 0;
    private Integer runsConceded = 0;
    private Integer wicketsTaken = 0;

    public BowlerStatsDTO() {
    }

    public BowlerStatsDTO(Double oversBowled, Integer maidens, Integer runsConceded, Integer wicketsTaken) {
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
