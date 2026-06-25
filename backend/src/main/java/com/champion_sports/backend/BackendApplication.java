package com.champion_sports.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import com.champion_sports.backend.auth.DeveloperKey;
import com.champion_sports.backend.auth.DeveloperKeyRepository;
import com.champion_sports.backend.teams.Team;
import com.champion_sports.backend.teams.TeamRepository;
import com.champion_sports.backend.matches.Match;
import com.champion_sports.backend.matches.MatchStatus;
import com.champion_sports.backend.matches.MatchRepository;
import java.time.LocalDateTime;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner seedDatabase(
			DeveloperKeyRepository keyRepo,
			TeamRepository teamRepo,
			MatchRepository matchRepo
	) {
		return (args) -> {
			String defaultClientId = "client_521b40fc0900";
			String defaultToken = "tok_9589d5be3eea4e62a0e36d8ec76f4820";
			if (!keyRepo.findByClientId(defaultClientId).isPresent()) {
				DeveloperKey key = new DeveloperKey("WordPress Default Key", defaultClientId, defaultToken);
				keyRepo.save(key);
				System.out.println("Default developer key seeded successfully!");
			}

			if (matchRepo.count() == 0) {
				Team teamA = new Team();
				teamA.setName("Royal Challengers Bangalore");
				teamA.setShortName("RCB");
				teamA.setCreatedAt(LocalDateTime.now());
				teamA.setUpdatedAt(LocalDateTime.now());
				teamRepo.save(teamA);

				Team teamB = new Team();
				teamB.setName("Chennai Super Kings");
				teamB.setShortName("CSK");
				teamB.setCreatedAt(LocalDateTime.now());
				teamB.setUpdatedAt(LocalDateTime.now());
				teamRepo.save(teamB);

				Match match = new Match();
				match.setTeamA(teamA);
				match.setTeamB(teamB);
				match.setVenue("M. Chinnaswamy Stadium");
				match.setMatchDate(LocalDateTime.now());
				match.setStatus(MatchStatus.SCHEDULED);
				match.setOvers(20);
				match.setCreatedAt(LocalDateTime.now());
				match.setUpdatedAt(LocalDateTime.now());
				matchRepo.save(match);
				System.out.println("Default teams and match seeded successfully!");
			}
		};
	}
}

