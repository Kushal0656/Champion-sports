package com.champion_sports.backend.dashboard;

public class DashboardDTO {

    private Long totalTeams;
    private Long totalPlayers;
    private Long totalMatches;
    private Long totalTournaments;

    public DashboardDTO() {
    }

    public Long getTotalTeams() {
        return totalTeams;
    }

    public void setTotalTeams(Long totalTeams) {
        this.totalTeams = totalTeams;
    }

    public Long getTotalPlayers() {
        return totalPlayers;
    }

    public void setTotalPlayers(Long totalPlayers) {
        this.totalPlayers = totalPlayers;
    }

    public Long getTotalMatches() {
        return totalMatches;
    }

    public void setTotalMatches(Long totalMatches) {
        this.totalMatches = totalMatches;
    }

    public Long getTotalTournaments() {
        return totalTournaments;
    }

    public void setTotalTournaments(Long totalTournaments) {
        this.totalTournaments = totalTournaments;
    }
}