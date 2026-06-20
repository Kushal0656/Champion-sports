package com.champion_sports.backend.overlay;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OverlaySlideService {

    private final OverlaySlideRepository repository;

    public OverlaySlideService(OverlaySlideRepository repository) {
        this.repository = repository;
    }

    public List<OverlaySlide> getAllSlides() {
        return repository.findAll();
    }

    public OverlaySlide getSlideById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Slide not found: " + id));
    }

    public OverlaySlide saveSlide(OverlaySlide slide) {
        return repository.save(slide);
    }

    public void deleteSlide(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public OverlaySlide activateSlide(Long id) {
        // Deactivate all slides first
        List<OverlaySlide> all = repository.findAll();
        for (OverlaySlide s : all) {
            s.setActive(false);
        }
        repository.saveAll(all);

        // Activate selected slide
        OverlaySlide target = getSlideById(id);
        target.setActive(true);
        return repository.save(target);
    }

    @Transactional
    public void deactivateAll() {
        List<OverlaySlide> all = repository.findAll();
        for (OverlaySlide s : all) {
            s.setActive(false);
        }
        repository.saveAll(all);
    }

    public OverlaySlide getActiveSlide() {
        List<OverlaySlide> activeList = repository.findByActive(true);
        if (activeList.isEmpty()) {
            return null;
        }
        return activeList.get(0);
    }

    public List<OverlaySlide> getSlidesByMatch(Long matchId) {
        return repository.findByMatchId(matchId);
    }
}
