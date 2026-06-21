package com.champion_sports.backend.broadcast;

import java.util.List;

public class LiveScoreDTO {

    private String battingTeam;
    private String bowlingTeam;

    private Integer runs;
    private Integer wickets;

    private String overs;

    private String striker;
    private Integer strikerRuns;
    private Integer strikerBalls;

    private String nonStriker;
    private Integer nonStrikerRuns;
    private Integer nonStrikerBalls;

    private String bowler;
    private Integer bowlerRuns;
    private Integer bowlerWickets;
    private String bowlerOvers;

    private Double currentRunRate;
    private Double requiredRunRate;

    private Integer target;
    private Integer runsNeeded;
    private Integer ballsRemaining;

    private List<String> lastSixBalls;

    public LiveScoreDTO() {
    }

    public String getBattingTeam() {
        return battingTeam;
    }

    public void setBattingTeam(String battingTeam) {
        this.battingTeam = battingTeam;
    }

    public String getBowlingTeam() {
        return bowlingTeam;
    }

    public void setBowlingTeam(String bowlingTeam) {
        this.bowlingTeam = bowlingTeam;
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

    public String getOvers() {
        return overs;
    }

    public void setOvers(String overs) {
        this.overs = overs;
    }

    public String getStriker() {
        return striker;
    }

    public void setStriker(String striker) {
        this.striker = striker;
    }

    public Integer getStrikerRuns() {
        return strikerRuns;
    }

    public void setStrikerRuns(Integer strikerRuns) {
        this.strikerRuns = strikerRuns;
    }

    public Integer getStrikerBalls() {
        return strikerBalls;
    }

    public void setStrikerBalls(Integer strikerBalls) {
        this.strikerBalls = strikerBalls;
    }

    public String getNonStriker() {
        return nonStriker;
    }

    public void setNonStriker(String nonStriker) {
        this.nonStriker = nonStriker;
    }

    public Integer getNonStrikerRuns() {
        return nonStrikerRuns;
    }

    public void setNonStrikerRuns(Integer nonStrikerRuns) {
        this.nonStrikerRuns = nonStrikerRuns;
    }

    public Integer getNonStrikerBalls() {
        return nonStrikerBalls;
    }

    public void setNonStrikerBalls(Integer nonStrikerBalls) {
        this.nonStrikerBalls = nonStrikerBalls;
    }

    public String getBowler() {
        return bowler;
    }

    public void setBowler(String bowler) {
        this.bowler = bowler;
    }

    public Integer getBowlerRuns() {
        return bowlerRuns;
    }

    public void setBowlerRuns(Integer bowlerRuns) {
        this.bowlerRuns = bowlerRuns;
    }

    public Integer getBowlerWickets() {
        return bowlerWickets;
    }

    public void setBowlerWickets(Integer bowlerWickets) {
        this.bowlerWickets = bowlerWickets;
    }

    public String getBowlerOvers() {
        return bowlerOvers;
    }

    public void setBowlerOvers(String bowlerOvers) {
        this.bowlerOvers = bowlerOvers;
    }

    public Double getCurrentRunRate() {
        return currentRunRate;
    }

    public void setCurrentRunRate(Double currentRunRate) {
        this.currentRunRate = currentRunRate;
    }

    public Double getRequiredRunRate() {
        return requiredRunRate;
    }

    public void setRequiredRunRate(Double requiredRunRate) {
        this.requiredRunRate = requiredRunRate;
    }

    public Integer getTarget() {
        return target;
    }

    public void setTarget(Integer target) {
        this.target = target;
    }

    public Integer getRunsNeeded() {
        return runsNeeded;
    }

    public void setRunsNeeded(Integer runsNeeded) {
        this.runsNeeded = runsNeeded;
    }

    public Integer getBallsRemaining() {
        return ballsRemaining;
    }

    public void setBallsRemaining(Integer ballsRemaining) {
        this.ballsRemaining = ballsRemaining;
    }

    public List<String> getLastSixBalls() {
        return lastSixBalls;
    }

    public void setLastSixBalls(List<String> lastSixBalls) {
        this.lastSixBalls = lastSixBalls;
    }
}