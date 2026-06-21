package com.champion_sports.backend.stats;

import java.util.List;

public class ScorecardDTO {

    private List<BattingStats> batting;
    private List<BowlingStats> bowling;

    public ScorecardDTO() {
    }

    public List<BattingStats> getBatting() {
        return batting;
    }

    public void setBatting(
            List<BattingStats> batting
    ) {
        this.batting = batting;
    }

    public List<BowlingStats> getBowling() {
        return bowling;
    }

    public void setBowling(
            List<BowlingStats> bowling
    ) {
        this.bowling = bowling;
    }
}