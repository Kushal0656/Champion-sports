package com.champion_sports.backend.scores;

public class BallEventDTO {
    private Long id;
    private Integer overNumber;
    private Integer ballNumber;
    private boolean wicket;
    private String extraType;
    private Integer extraRuns;
    private Integer batsmanRuns;
    private String wicketType;
    private String commentary;

    public BallEventDTO() {
    }

    public BallEventDTO(Long id, Integer overNumber, Integer ballNumber, boolean wicket, String extraType, Integer extraRuns, Integer batsmanRuns, String wicketType, String commentary) {
        this.id = id;
        this.overNumber = overNumber;
        this.ballNumber = ballNumber;
        this.wicket = wicket;
        this.extraType = extraType;
        this.extraRuns = extraRuns;
        this.batsmanRuns = batsmanRuns;
        this.wicketType = wicketType;
        this.commentary = commentary;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getOverNumber() {
        return overNumber;
    }

    public void setOverNumber(Integer overNumber) {
        this.overNumber = overNumber;
    }

    public Integer getBallNumber() {
        return ballNumber;
    }

    public void setBallNumber(Integer ballNumber) {
        this.ballNumber = ballNumber;
    }

    public boolean isWicket() {
        return wicket;
    }

    public void setWicket(boolean wicket) {
        this.wicket = wicket;
    }

    public String getExtraType() {
        return extraType;
    }

    public void setExtraType(String extraType) {
        this.extraType = extraType;
    }

    public Integer getExtraRuns() {
        return extraRuns;
    }

    public void setExtraRuns(Integer extraRuns) {
        this.extraRuns = extraRuns;
    }

    public Integer getBatsmanRuns() {
        return batsmanRuns;
    }

    public void setBatsmanRuns(Integer batsmanRuns) {
        this.batsmanRuns = batsmanRuns;
    }

    public String getWicketType() {
        return wicketType;
    }

    public void setWicketType(String wicketType) {
        this.wicketType = wicketType;
    }

    public String getCommentary() {
        return commentary;
    }

    public void setCommentary(String commentary) {
        this.commentary = commentary;
    }
}
