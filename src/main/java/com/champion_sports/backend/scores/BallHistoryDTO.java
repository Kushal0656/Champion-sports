package com.champion_sports.backend.scores;

public class BallHistoryDTO {
    private BallEventDTO event;
    private String batsmanName;
    private String bowlerName;

    public BallHistoryDTO() {
    }

    public BallHistoryDTO(BallEventDTO event, String batsmanName, String bowlerName) {
        this.event = event;
        this.batsmanName = batsmanName;
        this.bowlerName = bowlerName;
    }

    public BallEventDTO getEvent() {
        return event;
    }

    public void setEvent(BallEventDTO event) {
        this.event = event;
    }

    public String getBatsmanName() {
        return batsmanName;
    }

    public void setBatsmanName(String batsmanName) {
        this.batsmanName = batsmanName;
    }

    public String getBowlerName() {
        return bowlerName;
    }

    public void setBowlerName(String bowlerName) {
        this.bowlerName = bowlerName;
    }
}
