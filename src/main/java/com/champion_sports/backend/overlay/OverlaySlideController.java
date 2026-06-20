package com.champion_sports.backend.overlay;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/overlay-slides")
@CrossOrigin(origins = "*")
public class OverlaySlideController {

    private final OverlaySlideService service;

    public OverlaySlideController(OverlaySlideService service) {
        this.service = service;
    }

    @GetMapping
    public List<OverlaySlide> getAll() {
        return service.getAllSlides();
    }

    @PostMapping
    public ResponseEntity<OverlaySlide> createSlide(
            @RequestParam("title") String title,
            @RequestParam("width") Integer width,
            @RequestParam("height") Integer height,
            @RequestParam(value = "matchId", required = false) Long matchId,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        OverlaySlide slide = new OverlaySlide();
        slide.setTitle(title);
        slide.setWidth(width);
        slide.setHeight(height);
        slide.setMatchId(matchId);
        slide.setImageData(file.getBytes());
        slide.setImageContentType(file.getContentType());
        slide.setActive(false);
        OverlaySlide saved = service.saveSlide(slide);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    /** Full update: title, dimensions, and optionally replace background image */
    @PutMapping("/{id}")
    public ResponseEntity<OverlaySlide> updateSlide(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("width") Integer width,
            @RequestParam("height") Integer height,
            @RequestParam(value = "matchId", required = false) Long matchId,
            @RequestParam(value = "file", required = false) MultipartFile file
    ) throws IOException {
        OverlaySlide slide = service.getSlideById(id);
        slide.setTitle(title);
        slide.setWidth(width);
        slide.setHeight(height);
        slide.setMatchId(matchId);
        if (file != null && !file.isEmpty()) {
            slide.setImageData(file.getBytes());
            slide.setImageContentType(file.getContentType());
        }
        return ResponseEntity.ok(service.saveSlide(slide));
    }

    /** Metadata-only update: title and dimensions, no image replacement */
    @PutMapping("/{id}/title")
    public ResponseEntity<OverlaySlide> updateSlideTitle(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("width") Integer width,
            @RequestParam("height") Integer height,
            @RequestParam(value = "matchId", required = false) Long matchId
    ) {
        OverlaySlide slide = service.getSlideById(id);
        slide.setTitle(title);
        slide.setWidth(width);
        slide.setHeight(height);
        slide.setMatchId(matchId);
        return ResponseEntity.ok(service.saveSlide(slide));
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<byte[]> getSlideImage(@PathVariable Long id) {
        OverlaySlide slide = service.getSlideById(id);
        if (slide.getImageData() == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        HttpHeaders headers = new HttpHeaders();
        String contentType = slide.getImageContentType();
        headers.setContentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.IMAGE_PNG);
        headers.setCacheControl("no-cache, no-store, must-revalidate");
        return new ResponseEntity<>(slide.getImageData(), headers, HttpStatus.OK);
    }

    @PostMapping("/{id}/activate")
    public OverlaySlide activate(
            @PathVariable Long id,
            @RequestParam(value = "width", required = false) Integer width,
            @RequestParam(value = "height", required = false) Integer height
    ) {
        OverlaySlide slide = service.getSlideById(id);
        if (width != null) slide.setWidth(width);
        if (height != null) slide.setHeight(height);
        service.saveSlide(slide);
        return service.activateSlide(id);
    }

    @PostMapping("/deactivate")
    public ResponseEntity<String> deactivateAll() {
        service.deactivateAll();
        return ResponseEntity.ok("All slides deactivated");
    }

    @GetMapping("/active")
    public OverlaySlide getActive() {
        return service.getActiveSlide();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> delete(@PathVariable Long id) {
        service.deleteSlide(id);
        return ResponseEntity.ok("Slide deleted successfully");
    }

    @PostMapping("/{id}/layout")
    public OverlaySlide updateLayout(
            @PathVariable Long id,
            @RequestParam("layout") String layout
    ) {
        OverlaySlide slide = service.getSlideById(id);
        slide.setOverlayLayout(layout);
        return service.saveSlide(slide);
    }

    /** Save full OBS canvas layout JSON (scorecard tile + image + text elements) */
    @PostMapping("/{id}/canvas-layout")
    public OverlaySlide updateCanvasLayout(
            @PathVariable Long id,
            @RequestParam("layout") String layout
    ) {
        OverlaySlide slide = service.getSlideById(id);
        slide.setCanvasLayout(layout);
        return service.saveSlide(slide);
    }

    @GetMapping("/match/{matchId}")
    public List<OverlaySlide> getSlidesByMatch(@PathVariable Long matchId) {
        return service.getSlidesByMatch(matchId);
    }
}
