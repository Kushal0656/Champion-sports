package com.champion_sports.backend.content;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentRepository extends JpaRepository<Content, Long> {

    Optional<Content> findByKeyName(String keyName);

}