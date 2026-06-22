package com.champion_sports.backend.odds;

import java.time.LocalDateTime;

public class LiveOddsResponse {

    private double win_probability;
    private double opponent_probability;
    private double decimal_odds;
    private double opponent_odds;
    private double confidence;
    private String source;
    private String batting_team;
    private String bowling_team;
    private LocalDateTime last_updated;

    public LiveOddsResponse() {
    }

    public LiveOddsResponse(double win_probability, double opponent_probability, double decimal_odds, double opponent_odds, double confidence, String source, String batting_team, String bowling_team) {
        this.win_probability = Math.round(win_probability * 10.0) / 10.0;
        this.opponent_probability = Math.round(opponent_probability * 10.0) / 10.0;
        this.decimal_odds = Math.round(decimal_odds * 100.0) / 100.0;
        this.opponent_odds = Math.round(opponent_odds * 100.0) / 100.0;
        this.confidence = Math.round(confidence * 100.0) / 100.0;
        this.source = source;
        this.batting_team = batting_team;
        this.bowling_team = bowling_team;
        this.last_updated = LocalDateTime.now();
    }

    public double getWin_probability() {
        return win_probability;
    }

    public void setWin_probability(double win_probability) {
        this.win_probability = win_probability;
    }

    public double getOpponent_probability() {
        return opponent_probability;
    }

    public void setOpponent_probability(double opponent_probability) {
        this.opponent_probability = opponent_probability;
    }

    public double getDecimal_odds() {
        return decimal_odds;
    }

    public void setDecimal_odds(double decimal_odds) {
        this.decimal_odds = decimal_odds;
    }

    public double getOpponent_odds() {
        return opponent_odds;
    }

    public void setOpponent_odds(double opponent_odds) {
        this.opponent_odds = opponent_odds;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public LocalDateTime getLast_updated() {
        return last_updated;
    }

    public void setLast_updated(LocalDateTime last_updated) {
        this.last_updated = last_updated;
    }

    public String getBatting_team() {
        return batting_team;
    }

    public void setBatting_team(String batting_team) {
        this.batting_team = batting_team;
    }

    public String getBowling_team() {
        return bowling_team;
    }

    public void setBowling_team(String bowling_team) {
        this.bowling_team = bowling_team;
    }
}
