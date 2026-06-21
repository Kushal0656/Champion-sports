package com.champion_sports.backend.tournaments;

public class StandingDTO {
    private Long teamId;
    private String teamName;
    private String logoUrl;
    private Integer played;
    private Integer won;
    private Integer lost;
    private Integer points;
    private Double netRunRate;

    public StandingDTO() {
    }

    public StandingDTO(Long teamId, String teamName, String logoUrl, Integer played, Integer won, Integer lost, Integer points, Double netRunRate) {
        this.teamId = teamId;
        this.teamName = teamName;
        this.logoUrl = logoUrl;
        this.played = played;
        this.won = won;
        this.lost = lost;
        this.points = points;
        this.netRunRate = netRunRate;
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public Integer getPlayed() {
        return played;
    }

    public void setPlayed(Integer played) {
        this.played = played;
    }

    public Integer getWon() {
        return won;
    }

    public void setWon(Integer won) {
        this.won = won;
    }

    public Integer getLost() {
        return lost;
    }

    public void setLost(Integer lost) {
        this.lost = lost;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Double getNetRunRate() {
        return netRunRate;
    }

    public void setNetRunRate(Double netRunRate) {
        this.netRunRate = netRunRate;
    }
}
