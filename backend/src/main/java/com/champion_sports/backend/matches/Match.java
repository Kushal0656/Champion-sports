package com.champion_sports.backend.matches;

import java.time.LocalDateTime;

import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.tournaments.Tournament;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "team_a_id")
    private Team teamA;

    @ManyToOne
    @JoinColumn(name = "team_b_id")
    private Team teamB;

    @ManyToOne
    @JoinColumn(name = "tournament_id")
    private Tournament tournament;

    private String venue;

    private LocalDateTime matchDate;

    @Enumerated(EnumType.STRING)
    private MatchStatus status;

    private String tossWinner;

    private String tossDecision;

    @ManyToOne
    @JoinColumn(name = "winner_team_id")
    private Team winner;
    
    private Integer overs;

    private Integer currentInnings = 1;

    private Long currentStrikerId;

    private Long currentNonStrikerId;

    private Long currentBowlerId;

    private String activeOverlay = "NONE";

    private String resultMargin;

    private String streamUrl;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Match() {
    }

    public Long getId() {
        return id;
    }

    public Team getTeamA() {
        return teamA;
    }

    public void setTeamA(Team teamA) {
        this.teamA = teamA;
    }

    public Team getTeamB() {
        return teamB;
    }

    public void setTeamB(Team teamB) {
        this.teamB = teamB;
    }

    public Tournament getTournament() {
        return tournament;
    }

    public void setTournament(Tournament tournament) {
        this.tournament = tournament;
    }

    public String getVenue() {
        return venue;
    }

    public void setVenue(String venue) {
        this.venue = venue;
    }

    public LocalDateTime getMatchDate() {
        return matchDate;
    }

    public void setMatchDate(LocalDateTime matchDate) {
        this.matchDate = matchDate;
    }

    public MatchStatus getStatus() {
        return status;
    }

    public void setStatus(MatchStatus status) {
        this.status = status;
    }

    public String getTossWinner() {
        return tossWinner;
    }

    public void setTossWinner(String tossWinner) {
        this.tossWinner = tossWinner;
    }

    public String getTossDecision() {
        return tossDecision;
    }

    public void setTossDecision(String tossDecision) {
        this.tossDecision = tossDecision;
    }

    public Team getWinner() {
        return winner;
    }

    public void setWinner(Team winner) {
        this.winner = winner;
    }

    public Integer getOvers() {
        return overs;
    }

    public void setOvers(Integer overs) {
        this.overs = overs;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getCurrentInnings() {
        return currentInnings;
    }

    public void setCurrentInnings(Integer currentInnings) {
        this.currentInnings = currentInnings;
    }

    public Long getCurrentStrikerId() {
        return currentStrikerId;
    }

    public void setCurrentStrikerId(Long currentStrikerId) {
        this.currentStrikerId = currentStrikerId;
    }

    public Long getCurrentNonStrikerId() {
        return currentNonStrikerId;
    }

    public void setCurrentNonStrikerId(Long currentNonStrikerId) {
        this.currentNonStrikerId = currentNonStrikerId;
    }

    public Long getCurrentBowlerId() {
        return currentBowlerId;
    }

    public void setCurrentBowlerId(Long currentBowlerId) {
        this.currentBowlerId = currentBowlerId;
    }

    public String getActiveOverlay() {
        return activeOverlay;
    }

    public void setActiveOverlay(String activeOverlay) {
        this.activeOverlay = activeOverlay;
    }

    public String getResultMargin() {
        return resultMargin;
    }

    public void setResultMargin(String resultMargin) {
        this.resultMargin = resultMargin;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }

    // Jackson / Frontend compatibility delegations
    public Long getTeam1Id() {
        return teamA != null ? teamA.getId() : null;
    }

    public Long getTeam2Id() {
        return teamB != null ? teamB.getId() : null;
    }

    public String getTeam1Short() {
        return teamA != null ? teamA.getShortName() : null;
    }

    public String getTeam2Short() {
        return teamB != null ? teamB.getShortName() : null;
    }

    public Long getTossWinnerId() {
        if (tossWinner == null || tossWinner.isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(tossWinner);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public void setTossWinnerId(Long tossWinnerId) {
        if (tossWinnerId == null) {
            this.tossWinner = null;
        } else {
            this.tossWinner = String.valueOf(tossWinnerId);
        }
    }

    public Integer getOversLimit() {
        return overs;
    }

    public void setOversLimit(Integer oversLimit) {
        this.overs = oversLimit;
    }
}