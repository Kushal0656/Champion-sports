-- Champion Sports PHP - MySQL Schema
-- Run this file to create the database and all tables

CREATE DATABASE IF NOT EXISTS champion_sports CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE champion_sports;

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    logo_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players
CREATE TABLE IF NOT EXISTS players (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    team_id BIGINT,
    photo_path VARCHAR(500),
    jersey_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_a_id BIGINT,
    team_b_id BIGINT,
    venue VARCHAR(255),
    match_date DATETIME,
    status ENUM('SCHEDULED','LIVE','COMPLETED') DEFAULT 'SCHEDULED',
    current_innings INT DEFAULT 1,
    toss_winner_id BIGINT NULL,
    toss_decision VARCHAR(50) NULL,
    winner_id BIGINT NULL,
    result_margin VARCHAR(255) NULL,
    stream_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (toss_winner_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Innings
CREATE TABLE IF NOT EXISTS innings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT,
    innings_number INT DEFAULT 1,
    batting_team_id BIGINT,
    bowling_team_id BIGINT,
    runs INT DEFAULT 0,
    wickets INT DEFAULT 0,
    overs INT DEFAULT 0,
    balls INT DEFAULT 0,
    extras INT DEFAULT 0,
    target INT NULL,
    striker_id BIGINT NULL,
    non_striker_id BIGINT NULL,
    current_bowler_id BIGINT NULL,
    completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (batting_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (bowling_team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (striker_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (non_striker_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (current_bowler_id) REFERENCES players(id) ON DELETE SET NULL
);

-- Balls (ball-by-ball)
CREATE TABLE IF NOT EXISTS balls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    innings_id BIGINT,
    over_number INT,
    ball_number INT,
    striker_id BIGINT NULL,
    non_striker_id BIGINT NULL,
    bowler_id BIGINT NULL,
    runs INT DEFAULT 0,
    extra_type VARCHAR(50) NULL,
    extra_runs INT DEFAULT 0,
    is_wicket TINYINT(1) DEFAULT 0,
    wicket_type VARCHAR(100) NULL,
    fielder_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE,
    FOREIGN KEY (striker_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (non_striker_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (bowler_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (fielder_id) REFERENCES players(id) ON DELETE SET NULL
);

-- Batting Stats
CREATE TABLE IF NOT EXISTS batting_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    innings_id BIGINT,
    player_id BIGINT,
    runs INT DEFAULT 0,
    balls INT DEFAULT 0,
    fours INT DEFAULT 0,
    sixes INT DEFAULT 0,
    is_out TINYINT(1) DEFAULT 0,
    batting_position INT DEFAULT 0,
    FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Bowling Stats
CREATE TABLE IF NOT EXISTS bowling_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    innings_id BIGINT,
    player_id BIGINT,
    overs DOUBLE DEFAULT 0,
    runs_conceded INT DEFAULT 0,
    wickets INT DEFAULT 0,
    FOREIGN KEY (innings_id) REFERENCES innings(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Tournaments
CREATE TABLE IF NOT EXISTS tournaments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status VARCHAR(50) DEFAULT 'UPCOMING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament Teams
CREATE TABLE IF NOT EXISTS tournament_teams (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tournament_id BIGINT,
    team_id BIGINT,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Content (key-value store for dynamic config)
CREATE TABLE IF NOT EXISTS content (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content_key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Developer API Keys
CREATE TABLE IF NOT EXISTS developer_keys (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    client_id VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(255) NOT NULL,
    active TINYINT(1) DEFAULT 1,
    allowed_apis VARCHAR(1000) DEFAULT 'EVENTS,SERIES,BOOKMAKER,ODDS,SESSIONS,SESSION_RESULT,TV,SCORE,TOSS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Overlay Slides
CREATE TABLE IF NOT EXISTS overlay_slides (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    image_path VARCHAR(500),
    width INT DEFAULT 800,
    height INT DEFAULT 450,
    active TINYINT(1) DEFAULT 0,
    overlay_layout LONGTEXT NULL,
    canvas_layout LONGTEXT NULL,
    match_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: Admin@1234)
INSERT IGNORE INTO admin_users (email, password_hash)
VALUES ('admin@championsports.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert default content keys
INSERT IGNORE INTO content (content_key, value) VALUES ('homepage_video_url', '');
INSERT IGNORE INTO content (content_key, value) VALUES ('live_match_id', '');
INSERT IGNORE INTO content (content_key, value) VALUES ('live_innings_id', '');

-- Match Odds Table
CREATE TABLE IF NOT EXISTS match_odds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    match_id BIGINT UNIQUE NOT NULL,
    team_a_odds DOUBLE DEFAULT 1.90,
    team_b_odds DOUBLE DEFAULT 1.90,
    draw_odds DOUBLE DEFAULT 4.00,
    bookmaker_odds DOUBLE DEFAULT 1.90,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);
