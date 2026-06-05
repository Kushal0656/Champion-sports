package com.champion_sports.backend.content;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ContentService {

    private final ContentRepository contentRepository;

    public ContentService(ContentRepository contentRepository) {
        this.contentRepository = contentRepository;
    }

    public List<Content> getAllContent() {
        return contentRepository.findAll();
    }

    public Content getContentByKey(String keyName) {
        return contentRepository.findByKeyName(keyName)
                .orElseThrow(() -> new RuntimeException("Content not found: " + keyName));
    }

    public Content saveContent(Content content) {

        if (content.getCreatedAt() == null) {
            content.setCreatedAt(LocalDateTime.now());
        }

        content.setUpdatedAt(LocalDateTime.now());

        return contentRepository.save(content);
    }

    public void deleteContent(Long id) {
        contentRepository.deleteById(id);
    }
}