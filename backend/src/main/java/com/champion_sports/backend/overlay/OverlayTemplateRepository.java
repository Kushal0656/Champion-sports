package com.champion_sports.backend.overlay;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OverlayTemplateRepository extends JpaRepository<OverlayTemplate, Long> {
    List<OverlayTemplate> findByPrebuilt(Boolean prebuilt);
}
