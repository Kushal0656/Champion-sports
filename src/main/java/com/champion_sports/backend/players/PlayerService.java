package com.champion_sports.backend.players;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    public Player getPlayerById(Long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Player not found"));
    }

    public Player createPlayer(Player player) {

        player.setCreatedAt(LocalDateTime.now());
        player.setUpdatedAt(LocalDateTime.now());

        return playerRepository.save(player);
    }

    public Player updatePlayer(Long id, Player updatedPlayer) {

        Player existingPlayer = getPlayerById(id);

        existingPlayer.setName(updatedPlayer.getName());
        existingPlayer.setRole(updatedPlayer.getRole());
        existingPlayer.setPhotoUrl(updatedPlayer.getPhotoUrl());
        existingPlayer.setJerseyNumber(updatedPlayer.getJerseyNumber());
        existingPlayer.setTeam(updatedPlayer.getTeam());

        existingPlayer.setUpdatedAt(LocalDateTime.now());

        return playerRepository.save(existingPlayer);
    }

    public void deletePlayer(Long id) {
        playerRepository.deleteById(id);
    }
}