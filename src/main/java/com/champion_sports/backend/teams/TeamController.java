package com.champion_sports.backend.teams;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/teams")
@CrossOrigin(origins = "*")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @GetMapping
    public List<Team> getAllTeams() {
        return teamService.getAllTeams();
    }

    @GetMapping("/{id}")
    public Team getTeamById(@PathVariable Long id) {
        return teamService.getTeamById(id);
    }

    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public Team createTeam(
            @RequestParam("name") String name,
            @RequestParam(value = "teamLeader", required = false) String teamLeader,
            @RequestParam(value = "logo", required = false) MultipartFile logo
    ) throws IOException {
        Team team = new Team();
        team.setName(name);
        team.setTeamLeader(teamLeader);
        Team saved = teamService.createTeam(team);
        if (logo != null && !logo.isEmpty()) {
            teamService.saveLogo(saved.getId(), logo.getBytes(), logo.getContentType());
            saved = teamService.getTeamById(saved.getId());
        }
        return saved;
    }

    @PutMapping("/{id}")
    public Team updateTeam(
            @PathVariable Long id,
            @RequestBody Team team
    ) {
        return teamService.updateTeam(id, team);
    }

    @DeleteMapping("/{id}")
    public String deleteTeam(@PathVariable Long id) {

        teamService.deleteTeam(id);

        return "Team deleted successfully";
    }

    @PostMapping("/{id}/logo")
    public ResponseEntity<String> uploadLogo(@PathVariable Long id, @RequestParam("file") MultipartFile file) throws IOException {
        teamService.saveLogo(id, file.getBytes(), file.getContentType());
        return ResponseEntity.ok("Logo uploaded successfully");
    }

    @GetMapping("/{id}/logo")
    public ResponseEntity<byte[]> getLogo(@PathVariable Long id) {
        Team team = teamService.getTeamById(id);
        if (team.getLogoData() == null) {
            byte[] transparentPng = new byte[] {
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4,
                (byte) 0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00,
                0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, (byte) 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
                (byte) 0xAE, 0x42, 0x60, (byte) 0x82
            };
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(transparentPng);
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(team.getLogoContentType()))
                .body(team.getLogoData());
    }
}