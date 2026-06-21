package com.champion_sports.backend.scores;

import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.innings.Innings;
import java.util.List;

public class ScorecardStateDTO {
    private Match match;
    private String team1Name;
    private String team2Name;
    private String team1Short;
    private String team2Short;
    private Innings innings1;
    private Innings innings2;
    private LiveInfoDTO liveInfo;
    private List<ScorecardBattingEntryDTO> team1BattingScorecard;
    private List<ScorecardBowlingEntryDTO> team1BowlingScorecard;
    private List<ScorecardBattingEntryDTO> team2BattingScorecard;
    private List<ScorecardBowlingEntryDTO> team2BowlingScorecard;
    private List<BallHistoryDTO> ballHistory;

    public ScorecardStateDTO() {
    }

    public Match getMatch() {
        return match;
    }

    public void setMatch(Match match) {
        this.match = match;
    }

    public String getTeam1Name() {
        return team1Name;
    }

    public void setTeam1Name(String team1Name) {
        this.team1Name = team1Name;
    }

    public String getTeam2Name() {
        return team2Name;
    }

    public void setTeam2Name(String team2Name) {
        this.team2Name = team2Name;
    }

    public String getTeam1Short() {
        return team1Short;
    }

    public void setTeam1Short(String team1Short) {
        this.team1Short = team1Short;
    }

    public String getTeam2Short() {
        return team2Short;
    }

    public void setTeam2Short(String team2Short) {
        this.team2Short = team2Short;
    }

    public Innings getInnings1() {
        return innings1;
    }

    public void setInnings1(Innings innings1) {
        this.innings1 = innings1;
    }

    public Innings getInnings2() {
        return innings2;
    }

    public void setInnings2(Innings innings2) {
        this.innings2 = innings2;
    }

    public LiveInfoDTO getLiveInfo() {
        return liveInfo;
    }

    public void setLiveInfo(LiveInfoDTO liveInfo) {
        this.liveInfo = liveInfo;
    }

    public List<ScorecardBattingEntryDTO> getTeam1BattingScorecard() {
        return team1BattingScorecard;
    }

    public void setTeam1BattingScorecard(List<ScorecardBattingEntryDTO> team1BattingScorecard) {
        this.team1BattingScorecard = team1BattingScorecard;
    }

    public List<ScorecardBowlingEntryDTO> getTeam1BowlingScorecard() {
        return team1BowlingScorecard;
    }

    public void setTeam1BowlingScorecard(List<ScorecardBowlingEntryDTO> team1BowlingScorecard) {
        this.team1BowlingScorecard = team1BowlingScorecard;
    }

    public List<ScorecardBattingEntryDTO> getTeam2BattingScorecard() {
        return team2BattingScorecard;
    }

    public void setTeam2BattingScorecard(List<ScorecardBattingEntryDTO> team2BattingScorecard) {
        this.team2BattingScorecard = team2BattingScorecard;
    }

    public List<ScorecardBowlingEntryDTO> getTeam2BowlingScorecard() {
        return team2BowlingScorecard;
    }

    public void setTeam2BowlingScorecard(List<ScorecardBowlingEntryDTO> team2BowlingScorecard) {
        this.team2BowlingScorecard = team2BowlingScorecard;
    }

    public List<BallHistoryDTO> getBallHistory() {
        return ballHistory;
    }

    public void setBallHistory(List<BallHistoryDTO> ballHistory) {
        this.ballHistory = ballHistory;
    }
}
