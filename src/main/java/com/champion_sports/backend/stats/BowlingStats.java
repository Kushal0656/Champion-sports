package com.champion_sports.backend.stats;

import com.champion_sports.backend.innings.Innings;
import com.champion_sports.backend.players.Player;
import jakarta.persistence.*;

@Entity
@Table(name = "bowling_stats")
public class BowlingStats {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Innings innings;

    @ManyToOne
    private Player player;

    private Integer overs = 0;

    private Integer balls = 0;

    private Integer maidens = 0;

    private Integer runsConceded = 0;

    private Integer wickets = 0;

    public BowlingStats() {
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

    public Player getPlayer() {
        return player;
    }

    public void setPlayer(Player player) {
        this.player = player;
    }

    public Integer getOvers() {
        return overs;
    }

    public void setOvers(Integer overs) {
        this.overs = overs;
    }

    public Integer getBalls() {
        return balls;
    }

    public void setBalls(Integer balls) {
        this.balls = balls;
    }

    public Integer getMaidens() {
        return maidens;
    }

    public void setMaidens(Integer maidens) {
        this.maidens = maidens;
    }

    public Integer getRunsConceded() {
        return runsConceded;
    }

    public void setRunsConceded(Integer runsConceded) {
        this.runsConceded = runsConceded;
    }

    public Integer getWickets() {
        return wickets;
    }

    public void setWickets(Integer wickets) {
        this.wickets = wickets;
    }
}