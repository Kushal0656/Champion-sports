package com.champion_sports.backend.overlay;

import com.champion_sports.backend.websocket.LiveScoreWebSocketHandler;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/overlay-studio")
@CrossOrigin(origins = "*")
public class StreamOverlayStudioController {

    private final StreamAssetRepository assetRepository;
    private final StreamSceneRepository sceneRepository;
    private final OverlayTemplateRepository templateRepository;
    private final LiveScoreWebSocketHandler webSocketHandler;
    private final OverlaySlideRepository slideRepository;

    public StreamOverlayStudioController(
            StreamAssetRepository assetRepository,
            StreamSceneRepository sceneRepository,
            OverlayTemplateRepository templateRepository,
            LiveScoreWebSocketHandler webSocketHandler,
            OverlaySlideRepository slideRepository
    ) {
        this.assetRepository = assetRepository;
        this.sceneRepository = sceneRepository;
        this.templateRepository = templateRepository;
        this.webSocketHandler = webSocketHandler;
        this.slideRepository = slideRepository;
    }

    @PostConstruct
    public void seedDefaultData() {
        // Delete pre-seeded prebuilt templates
        List<OverlayTemplate> templates = templateRepository.findAll();
        for (OverlayTemplate t : templates) {
            if (Boolean.TRUE.equals(t.getPrebuilt())) {
                templateRepository.delete(t);
            }
        }

        // Delete predefined default scenes
        List<String> defaultSceneIds = List.of(
            "match-start", "toss", "live-match", "innings-break", "advertisement", "result", "presentation"
        );
        for (String id : defaultSceneIds) {
            if (sceneRepository.existsById(id)) {
                sceneRepository.deleteById(id);
            }
        }
    }

    @PostMapping("/scenes")
    public ResponseEntity<StreamScene> createScene(
            @RequestParam("id") String id,
            @RequestParam("name") String name
    ) {
        String cleanId = id.trim().toLowerCase().replaceAll("[^a-z0-9-]", "-");
        if (cleanId.isEmpty()) {
            cleanId = "scene-" + System.currentTimeMillis();
        }
        if (sceneRepository.existsById(cleanId)) {
            return new ResponseEntity<>(HttpStatus.CONFLICT);
        }
        
        StreamScene scene = new StreamScene(cleanId, name.trim(), "[]", "[]");
        StreamScene saved = sceneRepository.save(scene);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @DeleteMapping("/scenes/{id}")
    public ResponseEntity<String> deleteScene(@PathVariable String id) {
        if (sceneRepository.existsById(id)) {
            sceneRepository.deleteById(id);
            return ResponseEntity.ok("Scene deleted successfully");
        }
        return new ResponseEntity<>("Scene not found", HttpStatus.NOT_FOUND);
    }

    // ==========================================
    // ASSET ENDPOINTS
    // ==========================================

    @GetMapping("/assets")
    public List<StreamAsset> getAllAssets(@RequestParam(value = "type", required = false) String type) {
        if (type != null) {
            return assetRepository.findByType(type);
        }
        return assetRepository.findAll();
    }

    @PostMapping("/assets")
    public ResponseEntity<StreamAsset> uploadAsset(
            @RequestParam("name") String name,
            @RequestParam("type") String type,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        StreamAsset asset = new StreamAsset();
        asset.setName(name);
        asset.setType(type);
        asset.setFileData(file.getBytes());
        asset.setContentType(file.getContentType());
        StreamAsset saved = assetRepository.save(asset);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @GetMapping("/assets/{id}/file")
    public ResponseEntity<byte[]> getAssetFile(@PathVariable Long id) {
        Optional<StreamAsset> assetOpt = assetRepository.findById(id);
        if (assetOpt.isEmpty() || assetOpt.get().getFileData() == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamAsset asset = assetOpt.get();
        HttpHeaders headers = new HttpHeaders();
        String contentType = asset.getContentType();
        headers.setContentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.IMAGE_PNG);
        headers.setCacheControl("no-cache, no-store, must-revalidate");
        return new ResponseEntity<>(asset.getFileData(), headers, HttpStatus.OK);
    }

    @DeleteMapping("/assets/{id}")
    public ResponseEntity<String> deleteAsset(@PathVariable Long id) {
        if (assetRepository.existsById(id)) {
            assetRepository.deleteById(id);
            return ResponseEntity.ok("Asset deleted successfully");
        }
        return new ResponseEntity<>("Asset not found", HttpStatus.NOT_FOUND);
    }

    // ==========================================
    // SCENE ENDPOINTS
    // ==========================================

    @GetMapping("/scenes")
    public List<StreamScene> getAllScenes() {
        return sceneRepository.findAll();
    }

    @GetMapping("/scenes/active")
    public ResponseEntity<StreamScene> getActiveScene() {
        List<StreamScene> scenes = sceneRepository.findAll();
        for (StreamScene scene : scenes) {
            if (Boolean.TRUE.equals(scene.getActive())) {
                return ResponseEntity.ok(scene);
            }
        }
        // Return default or first if none active
        if (!scenes.isEmpty()) {
            return ResponseEntity.ok(scenes.get(0));
        }
        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    @PutMapping("/scenes/{id}/draft")
    public ResponseEntity<StreamScene> updateDraftLayout(
            @PathVariable String id,
            @RequestParam("layout") String layout
    ) {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamScene scene = sceneOpt.get();
        scene.setDraftLayout(layout);
        StreamScene saved = sceneRepository.save(scene);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/scenes/{id}/publish")
    public ResponseEntity<StreamScene> publishScene(
            @PathVariable String id,
            @RequestParam(value = "matchId", required = false) Long matchId
    ) {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamScene scene = sceneOpt.get();
        scene.setLiveLayout(scene.getDraftLayout());
        StreamScene saved = sceneRepository.save(scene);

        // Notify over WebSocket
        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "PUBLISH_SCENE");
        payload.put("sceneId", scene.getId());
        payload.put("liveLayout", scene.getLiveLayout());
        
        Long targetMatchId = matchId != null ? matchId : 0L;
        webSocketHandler.broadcastOverlay(targetMatchId, payload);

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/scenes/{id}/activate")
    public ResponseEntity<StreamScene> activateScene(
            @PathVariable String id,
            @RequestParam(value = "matchId", required = false) Long matchId
    ) {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }

        List<StreamScene> allScenes = sceneRepository.findAll();
        StreamScene activated = null;
        for (StreamScene scene : allScenes) {
            if (scene.getId().equals(id)) {
                scene.setActive(true);
                activated = sceneRepository.save(scene);
            } else {
                scene.setActive(false);
                sceneRepository.save(scene);
            }
        }

        // Notify over WebSocket
        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "SWITCH_SCENE");
        payload.put("sceneId", id);
        if (activated != null) {
            payload.put("liveLayout", activated.getLiveLayout());
        }

        Long targetMatchId = matchId != null ? matchId : 0L;
        webSocketHandler.broadcastOverlay(targetMatchId, payload);

        return ResponseEntity.ok(activated);
    }

    // Trigger explicit animation overlay events (e.g. boundary, wicket, custom alert)
    @PostMapping("/scenes/trigger-animation")
    public ResponseEntity<Map<String, String>> triggerAnimation(
            @RequestParam("animationType") String animationType,
            @RequestParam(value = "matchId", required = false) Long matchId,
            @RequestParam(value = "meta", required = false) String meta
    ) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "TRIGGER_ANIMATION");
        payload.put("animationType", animationType); // e.g. "FOUR", "SIX", "WICKET", "PLAYER_INTRO", "SPONSOR_AD"
        payload.put("meta", meta); // Custom meta (like player name, runs, details)

        Long targetMatchId = matchId != null ? matchId : 0L;
        webSocketHandler.broadcastOverlay(targetMatchId, payload);

        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Triggered " + animationType + " animation");
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // SCENE VIDEO & NAME CUSTOMIZATION ENDPOINTS
    // ==========================================

    @PostMapping("/scenes/{id}/video")
    public ResponseEntity<StreamScene> uploadSceneVideo(
            @PathVariable String id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamScene scene = sceneOpt.get();

        String uploadDir = "uploads/scene-videos/";
        java.nio.file.Path uploadPath = java.nio.file.Paths.get(uploadDir);
        if (!java.nio.file.Files.exists(uploadPath)) {
            java.nio.file.Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String fileName = id + fileExtension;
        java.nio.file.Path filePath = uploadPath.resolve(fileName);
        
        try (java.io.InputStream inputStream = file.getInputStream()) {
            java.nio.file.Files.copy(inputStream, filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }

        scene.setVideoFileName(fileName);
        scene.setVideoContentType(file.getContentType());
        StreamScene saved = sceneRepository.save(scene);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/scenes/{id}/video")
    public ResponseEntity<org.springframework.core.io.Resource> getSceneVideo(@PathVariable String id) {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty() || sceneOpt.get().getVideoFileName() == null) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamScene scene = sceneOpt.get();
        String uploadDir = "uploads/scene-videos/";
        java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir).resolve(scene.getVideoFileName());
        
        if (!java.nio.file.Files.exists(filePath)) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(filePath);
        String contentType = scene.getVideoContentType();
        if (contentType == null) {
            contentType = "video/mp4";
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/scenes/{id}/video")
    public ResponseEntity<StreamScene> deleteSceneVideo(@PathVariable String id) throws IOException {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamScene scene = sceneOpt.get();
        if (scene.getVideoFileName() != null) {
            String uploadDir = "uploads/scene-videos/";
            java.nio.file.Path filePath = java.nio.file.Paths.get(uploadDir).resolve(scene.getVideoFileName());
            java.nio.file.Files.deleteIfExists(filePath);
            scene.setVideoFileName(null);
            scene.setVideoContentType(null);
            scene = sceneRepository.save(scene);
        }
        return ResponseEntity.ok(scene);
    }

    @PutMapping("/scenes/{id}/name")
    public ResponseEntity<StreamScene> updateSceneName(
            @PathVariable String id,
            @RequestParam("name") String name
    ) {
        Optional<StreamScene> sceneOpt = sceneRepository.findById(id);
        if (sceneOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        StreamScene scene = sceneOpt.get();
        scene.setName(name);
        StreamScene saved = sceneRepository.save(scene);
        return ResponseEntity.ok(saved);
    }

    // ==========================================
    // TEMPLATE ENDPOINTS
    // ==========================================

    @GetMapping("/templates")
    public List<OverlayTemplate> getAllTemplates() {
        return templateRepository.findAll();
    }

    @PostMapping("/templates")
    public ResponseEntity<OverlayTemplate> saveTemplate(
            @RequestParam("name") String name,
            @RequestParam("layoutJson") String layoutJson
    ) {
        OverlayTemplate template = new OverlayTemplate(name, layoutJson, false);
        OverlayTemplate saved = templateRepository.save(template);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<String> deleteTemplate(@PathVariable Long id) {
        if (templateRepository.existsById(id)) {
            templateRepository.deleteById(id);
            return ResponseEntity.ok("Template deleted successfully");
        }
        return new ResponseEntity<>("Template not found", HttpStatus.NOT_FOUND);
    }

    @PostMapping("/scenes/import-slides")
    public ResponseEntity<List<StreamScene>> importSlidesForMatch(
            @RequestParam("matchId") Long matchId
    ) {
        List<OverlaySlide> slides = slideRepository.findByMatchId(matchId);
        List<StreamScene> importedScenes = new java.util.ArrayList<>();
        
        for (OverlaySlide slide : slides) {
            String sceneId = "slide-scene-" + slide.getId();
            
            // Build background element
            String bgImgEl = String.format(
                "{\"id\":\"slide_bg_%d\",\"type\":\"image\",\"name\":\"Background\",\"imageUrl\":\"http://localhost:8080/api/overlay-slides/%d/image\",\"x\":50,\"y\":50,\"width\":%d,\"height\":%d,\"visible\":true,\"zIndex\":1}",
                slide.getId(), slide.getId(), slide.getWidth(), slide.getHeight()
            );
            
            String layout = "[]";
            if (slide.getOverlayLayout() != null && !slide.getOverlayLayout().trim().isEmpty() && !slide.getOverlayLayout().equals("[]")) {
                String existing = slide.getOverlayLayout().trim();
                if (existing.startsWith("[") && existing.endsWith("]")) {
                    String inner = existing.substring(1, existing.length() - 1);
                    if (!inner.isEmpty()) {
                        layout = "[" + bgImgEl + "," + inner + "]";
                    } else {
                        layout = "[" + bgImgEl + "]";
                    }
                }
            } else {
                layout = "[" + bgImgEl + "]";
            }
            
            Optional<StreamScene> sceneOpt = sceneRepository.findById(sceneId);
            StreamScene scene;
            if (sceneOpt.isPresent()) {
                scene = sceneOpt.get();
                scene.setName(slide.getTitle());
                scene.setDraftLayout(layout);
                scene.setLiveLayout(layout);
            } else {
                scene = new StreamScene(sceneId, slide.getTitle(), layout, layout);
            }
            importedScenes.add(sceneRepository.save(scene));
        }
        
        return ResponseEntity.ok(importedScenes);
    }
}
