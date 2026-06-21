package com.champion_sports.backend.players;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.teams.TeamRepository;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final TeamRepository teamRepository;

    public PlayerService(PlayerRepository playerRepository, TeamRepository teamRepository) {
        this.playerRepository = playerRepository;
        this.teamRepository = teamRepository;
    }

    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    public List<Player> getPlayersByTeamId(Long teamId) {
        return playerRepository.findByTeamId(teamId);
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

    public List<Player> getPlayersByJerseyNumber(Integer jerseyNumber) {
        return playerRepository.findByJerseyNumber(jerseyNumber);
    }

    public void savePhoto(Long id, byte[] data, String contentType) {
        Player player = getPlayerById(id);
        player.setPhotoData(data);
        player.setPhotoContentType(contentType);
        player.setPhotoUrl("http://localhost:8080/api/players/" + id + "/photo");
        player.setUpdatedAt(LocalDateTime.now());
        playerRepository.save(player);
    }

    public Player assignTeam(Long playerId, Long teamId) {
        Player player = getPlayerById(playerId);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found"));
        player.setTeam(team);
        player.setUpdatedAt(LocalDateTime.now());
        return playerRepository.save(player);
    }

    public Player removeTeam(Long playerId) {
        Player player = getPlayerById(playerId);
        player.setTeam(null);
        player.setUpdatedAt(LocalDateTime.now());
        return playerRepository.save(player);
    }
}