package com.champion_sports.backend.scoreboard;

public class ScoreboardDTO {

    private String battingTeam;

    private Integer runs;

    private Integer wickets;

    private Integer overs;

    private Integer balls;

    private Double runRate;

    public ScoreboardDTO() {
    }

    public String getBattingTeam() {
        return battingTeam;
    }

    public void setBattingTeam(String battingTeam) {
        this.battingTeam = battingTeam;
    }

    public Integer getRuns() {
        return runs;
    }

    public void setRuns(Integer runs) {
        this.runs = runs;
    }

    public Integer getWickets() {
        return wickets;
    }

    public void setWickets(Integer wickets) {
        this.wickets = wickets;
    }

    public Integer getOvers() {
        return overs;
    }

    public void setOvers(Integer overs) {
        this.overs = overs;
    }

    public Integer getBalls() {
        return balls;
    }

    public void setBalls(Integer balls) {
        this.balls = balls;
    }

    public Double getRunRate() {
        return runRate;
    }

    public void setRunRate(Double runRate) {
        this.runRate = runRate;
    }
}