<?php
// =============================================
// DATABASE CONFIGURATION
// Change these values to match your MySQL setup
// =============================================
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'champion_sports');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
define('DB_CHARSET', 'utf8mb4');

// Admin password (change this!)
define('ADMIN_PASSWORD', 'Admin@1234');

// Site URL (no trailing slash)
define('SITE_URL', getenv('SITE_URL') ?: 'http://localhost:8081');

// Upload directory
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', SITE_URL . '/uploads/');

// Machine Learning Service URL on Render
define('ML_SERVICE_URL', 'https://champion-sports-ml.onrender.com');

// =============================================
// PDO DATABASE CONNECTION
// =============================================
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $port = getenv('DB_PORT');
            $dsn = "mysql:host=" . DB_HOST . ($port ? ";port=" . $port : "") . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
            
            // Auto-migration check: ensure innings has personnel columns
            try {
                $check = $pdo->query("SHOW COLUMNS FROM innings LIKE 'striker_id'")->fetch();
                if (!$check) {
                    $pdo->exec("ALTER TABLE innings 
                        ADD COLUMN striker_id BIGINT NULL,
                        ADD COLUMN non_striker_id BIGINT NULL,
                        ADD COLUMN current_bowler_id BIGINT NULL,
                        ADD COLUMN completed TINYINT(1) DEFAULT 0,
                        ADD FOREIGN KEY (striker_id) REFERENCES players(id) ON DELETE SET NULL,
                        ADD FOREIGN KEY (non_striker_id) REFERENCES players(id) ON DELETE SET NULL,
                        ADD FOREIGN KEY (current_bowler_id) REFERENCES players(id) ON DELETE SET NULL");
                }
            } catch (Exception $ex) {}

            // Auto-migration check: ensure overlay_slides has canvas_layout column
            try {
                $check = $pdo->query("SHOW COLUMNS FROM overlay_slides LIKE 'canvas_layout'")->fetch();
                if (!$check) {
                    $pdo->exec("ALTER TABLE overlay_slides ADD COLUMN canvas_layout LONGTEXT NULL");
                }
            } catch (Exception $ex) {}
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    return $pdo;
}
