package com.champion_sports.backend.teams;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class TeamService {

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    public Team getTeamById(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found"));
    }

    public Team createTeam(Team team) {

        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());

        return teamRepository.save(team);
    }

    public Team updateTeam(Long id, Team updatedTeam) {

        Team existingTeam = getTeamById(id);

        existingTeam.setName(updatedTeam.getName());
        existingTeam.setShortName(updatedTeam.getShortName());
        existingTeam.setLogoUrl(updatedTeam.getLogoUrl());
        existingTeam.setDescription(updatedTeam.getDescription());
        existingTeam.setCaptain(updatedTeam.getCaptain());

        existingTeam.setUpdatedAt(LocalDateTime.now());

        return teamRepository.save(existingTeam);
    }

    public void deleteTeam(Long id) {
        teamRepository.deleteById(id);
    }
}