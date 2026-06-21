package com.champion_sports.backend.overlay;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StreamAssetRepository extends JpaRepository<StreamAsset, Long> {
    List<StreamAsset> findByType(String type);
}
