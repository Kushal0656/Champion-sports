package com.champion_sports.backend.odds;

import java.time.LocalDateTime;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "match_odds")
public class MatchOdds {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long matchId;

    private Double teamAOdds;

    private Double teamBOdds;

    private Double drawOdds;

    private Double bookmakerOdds;

    private LocalDateTime updatedAt = LocalDateTime.now();

    public MatchOdds() {
    }

    public MatchOdds(Long matchId, Double teamAOdds, Double teamBOdds, Double drawOdds, Double bookmakerOdds) {
        this.matchId = matchId;
        this.teamAOdds = teamAOdds;
        this.teamBOdds = teamBOdds;
        this.drawOdds = drawOdds;
        this.bookmakerOdds = bookmakerOdds;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public Double getTeamAOdds() {
        return teamAOdds;
    }

    public void setTeamAOdds(Double teamAOdds) {
        this.teamAOdds = teamAOdds;
    }

    public Double getTeamBOdds() {
        return teamBOdds;
    }

    public void setTeamBOdds(Double teamBOdds) {
        this.teamBOdds = teamBOdds;
    }

    public Double getDrawOdds() {
        return drawOdds;
    }

    public void setDrawOdds(Double drawOdds) {
        this.drawOdds = drawOdds;
    }

    public Double getBookmakerOdds() {
        return bookmakerOdds;
    }

    public void setBookmakerOdds(Double bookmakerOdds) {
        this.bookmakerOdds = bookmakerOdds;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
