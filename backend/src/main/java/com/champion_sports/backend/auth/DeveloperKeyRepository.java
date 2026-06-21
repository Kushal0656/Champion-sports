package com.champion_sports.backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeveloperKeyRepository extends JpaRepository<DeveloperKey, Long> {
    Optional<DeveloperKey> findByClientId(String clientId);
}
