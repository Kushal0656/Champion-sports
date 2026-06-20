package com.champion_sports.backend.content;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/content")
@CrossOrigin(origins = "*")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping
    public List<Content> getAllContent() {
        return contentService.getAllContent();
    }

    @GetMapping("/{keyName}")
    public Content getContentByKey(@PathVariable String keyName) {
        return contentService.getContentByKey(keyName);
    }

    @PostMapping
    public Content createContent(@RequestBody Content content) {
        return contentService.saveContent(content);
    }

    @DeleteMapping("/{id}")
    public void deleteContent(@PathVariable Long id) {
        contentService.deleteContent(id);
    }

    @GetMapping("/key/{keyName}")
    public Content getContentByKeyOptional(@PathVariable String keyName) {
        return contentService.getContentByKeyOptional(keyName);
    }

    @PostMapping("/key/{keyName}")
    public Content updateContentByKey(
            @PathVariable String keyName,
            @RequestParam("value") String value
    ) {
        Content content = contentService.getContentByKeyOptional(keyName);
        if (content == null) {
            content = new Content();
            content.setKeyName(keyName);
            content.setDescription("Auto-created setting via endpoint");
        }
        content.setValue(value);
        return contentService.saveContent(content);
    }
}