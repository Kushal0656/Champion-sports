package com.champion_sports.backend.overlay;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "overlay_templates")
public class OverlayTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(name = "layout_json", columnDefinition = "TEXT")
    private String layoutJson;

    private Boolean prebuilt = false;

    public OverlayTemplate() {
    }

    public OverlayTemplate(String name, String layoutJson, Boolean prebuilt) {
        this.name = name;
        this.layoutJson = layoutJson;
        this.prebuilt = prebuilt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLayoutJson() {
        return layoutJson;
    }

    public void setLayoutJson(String layoutJson) {
        this.layoutJson = layoutJson;
    }

    public Boolean getPrebuilt() {
        return prebuilt;
    }

    public void setPrebuilt(Boolean prebuilt) {
        this.prebuilt = prebuilt;
    }
}
