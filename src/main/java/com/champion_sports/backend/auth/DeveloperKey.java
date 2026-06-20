package com.champion_sports.backend.auth;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "developer_keys")
public class DeveloperKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "client_id", unique = true, nullable = false)
    private String clientId;

    @Column(nullable = false)
    private String token;

    private boolean active = true;

    @Column(name = "allowed_apis", length = 1000)
    private String allowedApis = "EVENTS,SERIES,BOOKMAKER,ODDS,SESSIONS,SESSION_RESULT,TV,SCORE,TOSS";

    private LocalDateTime createdAt = LocalDateTime.now();

    public DeveloperKey() {
    }

    public DeveloperKey(String name, String clientId, String token) {
        this.name = name;
        this.clientId = clientId;
        this.token = token;
        this.active = true;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getAllowedApis() {
        return allowedApis;
    }

    public void setAllowedApis(String allowedApis) {
        this.allowedApis = allowedApis;
    }

    public List<String> getAllowedApisList() {
        if (allowedApis == null || allowedApis.isEmpty()) {
            return Collections.emptyList();
        }
        return Arrays.asList(allowedApis.split(","));
    }

    public void setAllowedApisList(List<String> list) {
        if (list == null || list.isEmpty()) {
            this.allowedApis = "";
        } else {
            this.allowedApis = String.join(",", list);
        }
    }
}
