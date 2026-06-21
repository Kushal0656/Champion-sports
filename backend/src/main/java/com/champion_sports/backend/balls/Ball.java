package com.champion_sports.backend.balls;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.players.Player;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "balls")
public class Ball {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Innings innings;

    private Integer overNumber;

    private Integer ballNumber;

    @ManyToOne
    private Player striker;

    @ManyToOne
    private Player nonStriker;

    @ManyToOne
    private Player bowler;

    private Integer runs;

    private Boolean wicket = false;

    private String wicketType;

    @ManyToOne
    private Player dismissedPlayer;

    private Boolean wide = false;

    private Boolean noBall = false;

    private Boolean bye = false;

    private Boolean legBye = false;

    @Column(length = 500)
    private String commentary;

    private LocalDateTime createdAt;

    public Ball() {
    }

    public Long getId() {
        return id;
    }

    public Innings getInnings() {
        return innings;
    }

    public void setInnings(Innings innings) {
        this.innings = innings;
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

    public Player getStriker() {
        return striker;
    }

    public void setStriker(Player striker) {
        this.striker = striker;
    }

    public Player getNonStriker() {
        return nonStriker;
    }

    public void setNonStriker(Player nonStriker) {
        this.nonStriker = nonStriker;
    }

    public Player getBowler() {
        return bowler;
    }

    public void setBowler(Player bowler) {
        this.bowler = bowler;
    }

    public Integer getRuns() {
        return runs;
    }

    public void setRuns(Integer runs) {
        this.runs = runs;
    }

    public Boolean getWicket() {
        return wicket;
    }

    public void setWicket(Boolean wicket) {
        this.wicket = wicket;
    }

    public String getWicketType() {
        return wicketType;
    }

    public void setWicketType(String wicketType) {
        this.wicketType = wicketType;
    }

    public Boolean getWide() {
        return wide;
    }

    public void setWide(Boolean wide) {
        this.wide = wide;
    }

    public Boolean getNoBall() {
        return noBall;
    }

    public void setNoBall(Boolean noBall) {
        this.noBall = noBall;
    }

    public Boolean getBye() {
        return bye;
    }

    public void setBye(Boolean bye) {
        this.bye = bye;
    }

    public Boolean getLegBye() {
        return legBye;
    }

    public void setLegBye(Boolean legBye) {
        this.legBye = legBye;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Player getDismissedPlayer() {
        return dismissedPlayer;
    }

    public void setDismissedPlayer(Player dismissedPlayer) {
        this.dismissedPlayer = dismissedPlayer;
    }

    public String getCommentary() {
        return commentary;
    }

    public void setCommentary(String commentary) {
        this.commentary = commentary;
    }
}