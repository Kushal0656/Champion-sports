package com.champion_sports.backend.matches;

public class MatchResultDTO {

    private String winner;

    private String result;

    private Integer target;

    private Integer winningMargin;

    public MatchResultDTO() {
    }

    public String getWinner() {
        return winner;
    }

    public void setWinner(String winner) {
        this.winner = winner;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public Integer getTarget() {
        return target;
    }

    public void setTarget(Integer target) {
        this.target = target;
    }

    public Integer getWinningMargin() {
        return winningMargin;
    }

    public void setWinningMargin(Integer winningMargin) {
        this.winningMargin = winningMargin;
    }
}