package com.champion_sports.backend.overlay;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OverlaySlideRepository extends JpaRepository<OverlaySlide, Long> {
    List<OverlaySlide> findByActive(Boolean active);
    List<OverlaySlide> findByMatchId(Long matchId);
}
