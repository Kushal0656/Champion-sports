package com.champion_sports.backend.scores;

public class BattingStatsInnerDTO {
    private boolean dismissed;
    private String dismissalDetails;
    private Integer runsScored;
    private Integer ballsFaced;
    private Integer fours;
    private Integer sixes;

    public BattingStatsInnerDTO() {
    }

    public BattingStatsInnerDTO(boolean dismissed, String dismissalDetails, Integer runsScored, Integer ballsFaced, Integer fours, Integer sixes) {
        this.dismissed = dismissed;
        this.dismissalDetails = dismissalDetails;
        this.runsScored = runsScored;
        this.ballsFaced = ballsFaced;
        this.fours = fours;
        this.sixes = sixes;
    }

    public boolean isDismissed() {
        return dismissed;
    }

    public void setDismissed(boolean dismissed) {
        this.dismissed = dismissed;
    }

    public String getDismissalDetails() {
        return dismissalDetails;
    }

    public void setDismissalDetails(String dismissalDetails) {
        this.dismissalDetails = dismissalDetails;
    }

    public Integer getRunsScored() {
        return runsScored;
    }

    public void setRunsScored(Integer runsScored) {
        this.runsScored = runsScored;
    }

    public Integer getBallsFaced() {
        return ballsFaced;
    }

    public void setBallsFaced(Integer ballsFaced) {
        this.ballsFaced = ballsFaced;
    }

    public Integer getFours() {
        return fours;
    }

    public void setFours(Integer fours) {
        this.fours = fours;
    }

    public Integer getSixes() {
        return sixes;
    }

    public void setSixes(Integer sixes) {
        this.sixes = sixes;
    }
}
