package com.champion_sports.backend.overlay;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "overlay_slides")
public class OverlaySlide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(name = "match_id")
    private Long matchId;

    private Integer width = 800;

    private Integer height = 450;

    @Column(name = "image_data", columnDefinition = "bytea")
    private byte[] imageData;

    private String imageContentType;

    private Boolean active = false;

    @Column(name = "overlay_layout", columnDefinition = "TEXT")
    private String overlayLayout;

    @Column(name = "canvas_layout", columnDefinition = "TEXT")
    private String canvasLayout;

    public OverlaySlide() {
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Long getMatchId() {
        return matchId;
    }

    public void setMatchId(Long matchId) {
        this.matchId = matchId;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }

    public byte[] getImageData() {
        return imageData;
    }

    public void setImageData(byte[] imageData) {
        this.imageData = imageData;
    }

    public String getImageContentType() {
        return imageContentType;
    }

    public void setImageContentType(String imageContentType) {
        this.imageContentType = imageContentType;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getOverlayLayout() {
        return overlayLayout;
    }

    public void setOverlayLayout(String overlayLayout) {
        this.overlayLayout = overlayLayout;
    }

    public String getCanvasLayout() {
        return canvasLayout;
    }

    public void setCanvasLayout(String canvasLayout) {
        this.canvasLayout = canvasLayout;
    }
}
