package com.champion_sports.backend.players;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/players")
@CrossOrigin(origins = "*")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @GetMapping
    public List<Player> getAllPlayers(
            @RequestParam(value = "teamId", required = false) Long teamId,
            @RequestParam(value = "jerseyNumber", required = false) Integer jerseyNumber
    ) {
        if (teamId != null) {
            return playerService.getPlayersByTeamId(teamId);
        }
        if (jerseyNumber != null) {
            return playerService.getPlayersByJerseyNumber(jerseyNumber);
        }
        return playerService.getAllPlayers();
    }

    @GetMapping("/{id}")
    public Player getPlayerById(@PathVariable Long id) {
        return playerService.getPlayerById(id);
    }

    @PostMapping
    public Player createPlayer(@RequestBody Player player) {
        return playerService.createPlayer(player);
    }

    @PutMapping("/{id}")
    public Player updatePlayer(
            @PathVariable Long id,
            @RequestBody Player player
    ) {
        return playerService.updatePlayer(id, player);
    }

    @DeleteMapping("/{id}")
    public String deletePlayer(@PathVariable Long id) {

        playerService.deletePlayer(id);

        return "Player deleted successfully";
    }

    @PostMapping("/{id}/photo")
    public ResponseEntity<String> uploadPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
        playerService.savePhoto(id, file.getBytes(), file.getContentType());
        return ResponseEntity.ok("Photo uploaded successfully");
    }

    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> getPhoto(@PathVariable Long id) {
        Player player = playerService.getPlayerById(id);
        if (player.getPhotoData() == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(player.getPhotoContentType()))
                .body(player.getPhotoData());
    }

    @PutMapping("/{id}/assign-team/{teamId}")
    public Player assignTeam(@PathVariable Long id, @PathVariable Long teamId) {
        return playerService.assignTeam(id, teamId);
    }

    @PutMapping("/{id}/remove-team")
    public Player removeTeam(@PathVariable Long id) {
        return playerService.removeTeam(id);
    }
}