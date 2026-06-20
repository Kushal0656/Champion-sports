package com.champion_sports.backend.overlay;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "stream_scenes")
public class StreamScene {

    @Id
    private String id; // e.g. "match-start", "toss", "live-match", "innings-break", "advertisement", "result", "presentation"

    private String name;

    @Column(name = "draft_layout", columnDefinition = "TEXT")
    private String draftLayout;

    @Column(name = "live_layout", columnDefinition = "TEXT")
    private String liveLayout;

    private Boolean active = false;

    @Column(name = "video_file_name")
    private String videoFileName;

    @Column(name = "video_content_type")
    private String videoContentType;

    public StreamScene() {
    }

    public StreamScene(String id, String name, String draftLayout, String liveLayout) {
        this.id = id;
        this.name = name;
        this.draftLayout = draftLayout;
        this.liveLayout = liveLayout;
        this.active = false;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDraftLayout() {
        return draftLayout;
    }

    public void setDraftLayout(String draftLayout) {
        this.draftLayout = draftLayout;
    }

    public String getLiveLayout() {
        return liveLayout;
    }

    public void setLiveLayout(String liveLayout) {
        this.liveLayout = liveLayout;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getVideoFileName() {
        return videoFileName;
    }

    public void setVideoFileName(String videoFileName) {
        this.videoFileName = videoFileName;
    }

    public String getVideoContentType() {
        return videoContentType;
    }

    public void setVideoContentType(String videoContentType) {
        this.videoContentType = videoContentType;
    }
}
