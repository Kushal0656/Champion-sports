<?php
// =============================================
// DATABASE CONFIGURATION
// Change these values to match your MySQL setup
// =============================================
function getWPConfig(): ?array {
    $paths = [
        __DIR__ . '/../../wp-config.php',
        __DIR__ . '/../../../wp-config.php'
    ];
    foreach ($paths as $path) {
        if (file_exists($path)) {
            $content = file_get_contents($path);
            $config = [];
            if (preg_match("/define\(\s*['\"]DB_HOST['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $content, $matches)) {
                $config['host'] = $matches[1];
            }
            if (preg_match("/define\(\s*['\"]DB_NAME['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $content, $matches)) {
                $config['name'] = $matches[1];
            }
            if (preg_match("/define\(\s*['\"]DB_USER['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $content, $matches)) {
                $config['user'] = $matches[1];
            }
            if (preg_match("/define\(\s*['\"]DB_PASSWORD['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)/i", $content, $matches)) {
                $config['pass'] = $matches[1];
            }
            return $config;
        }
    }
    return null;
}

function getDynamicSiteUrl(): string {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($_SERVER['SERVER_PORT'] ?? '') == 443) ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8081';
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    $path = '/champion-sports-php';
    if (strpos($uri, $path) === 0 || strpos($_SERVER['SCRIPT_NAME'] ?? '', $path) === 0) {
        return $protocol . $host . $path;
    }
    return $protocol . $host;
}

$wpConfig = getWPConfig();

define('DB_HOST', getenv('DB_HOST') ?: ($wpConfig['host'] ?? '127.0.0.1'));
define('DB_NAME', getenv('DB_NAME') ?: ($wpConfig['name'] ?? 'champion_sports'));
define('DB_USER', getenv('DB_USER') ?: ($wpConfig['user'] ?? 'root'));
define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : ($wpConfig['pass'] ?? ''));
define('DB_CHARSET', 'utf8mb4');

// Admin password (change this!)
define('ADMIN_PASSWORD', 'Admin@1234');

// Site URL (no trailing slash)
define('SITE_URL', getenv('SITE_URL') ?: (isset($_SERVER['HTTP_HOST']) ? getDynamicSiteUrl() : 'http://localhost:8081'));

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

            // Auto-install: check if 'teams' table exists, if not run schema.sql
            try {
                $pdo->query("SELECT 1 FROM teams LIMIT 1");
            } catch (Exception $e) {
                $schemaFile = __DIR__ . '/../schema.sql';
                if (file_exists($schemaFile)) {
                    $sql = file_get_contents($schemaFile);
                    $sql = preg_replace('/CREATE DATABASE.*?;/is', '', $sql);
                    $sql = preg_replace('/USE\s+[a-zA-Z0-9_]+;/i', '', $sql);
                    $pdo->exec($sql);
                }
            }
            
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
