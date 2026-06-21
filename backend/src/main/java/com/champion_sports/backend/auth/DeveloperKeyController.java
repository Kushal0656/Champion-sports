package com.champion_sports.backend.auth;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/developer-keys")
@CrossOrigin(origins = "*")
public class DeveloperKeyController {

    private final DeveloperKeyRepository developerKeyRepository;

    public DeveloperKeyController(DeveloperKeyRepository developerKeyRepository) {
        this.developerKeyRepository = developerKeyRepository;
    }

    @GetMapping
    public ResponseEntity<List<DeveloperKey>> listKeys() {
        return ResponseEntity.ok(developerKeyRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<DeveloperKey> generateKey(@RequestParam String name) {
        String clientId = "client_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String token = "tok_" + UUID.randomUUID().toString().replace("-", "");
        
        DeveloperKey developerKey = new DeveloperKey(name, clientId, token);
        DeveloperKey saved = developerKeyRepository.save(developerKey);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<DeveloperKey> toggleKey(@PathVariable Long id) {
        return developerKeyRepository.findById(id)
                .map(key -> {
                    key.setActive(!key.isActive());
                    return ResponseEntity.ok(developerKeyRepository.save(key));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<DeveloperKey> updatePermissions(@PathVariable Long id, @RequestBody List<String> permissions) {
        return developerKeyRepository.findById(id)
                .map(key -> {
                    key.setAllowedApisList(permissions);
                    return ResponseEntity.ok(developerKeyRepository.save(key));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKey(@PathVariable Long id) {
        if (developerKeyRepository.existsById(id)) {
            developerKeyRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
