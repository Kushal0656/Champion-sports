<?php
require_once __DIR__ . '/../config/database.php';

session_start();

function isAdminLoggedIn(): bool {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function requireAdmin(): void {
    if (!isAdminLoggedIn()) {
        header('Location: ' . SITE_URL . '/login.php');
        exit;
    }
}

function loginAdmin(string $email, string $password): bool {
    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_email'] = $email;
        return true;
    }
    // Fallback: check hardcoded password
    if ($email === 'admin@championsports.com' && $password === ADMIN_PASSWORD) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_email'] = $email;
        return true;
    }
    return false;
}

function loginAdminByEmail(string $email): bool {
    $allowed = ['kushalkarri1117@gmail.com', 'admin@championsports.com'];
    if (in_array(trim($email), $allowed)) {
        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_email'] = $email;
        return true;
    }
    return false;
}

function logoutAdmin(): void {
    $_SESSION = [];
    session_destroy();
}

function jsonResponse(mixed $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: *');
    echo json_encode($data);
    exit;
}

function getInput(): array {
    $body = file_get_contents('php://input');
    if (!empty($body)) {
        $json = json_decode($body, true);
        if (is_array($json)) return $json;
    }
    return $_POST ?? [];
}

function validateDeveloperKey(): bool {
    $db = getDB();
    $clientId = $_GET['clientId'] ?? $_SERVER['HTTP_X_CLIENT_ID'] ?? null;
    $token     = $_GET['token']    ?? $_SERVER['HTTP_X_TOKEN']    ?? $_SERVER['HTTP_X_API_KEY'] ?? null;
    if (!$clientId || !$token) return false;
    $stmt = $db->prepare("SELECT id FROM developer_keys WHERE client_id = ? AND token = ? AND active = 1");
    $stmt->execute([$clientId, $token]);
    return (bool)$stmt->fetch();
}

function generateUUID(): string {
    return sprintf('%04x%04x%04x%04x%04x%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

function parseMultipartPut(): array {
    $raw_data = file_get_contents('php://input');
    if (empty($raw_data)) return ['data' => [], 'files' => []];
    
    // Find boundary
    $first_line = substr($raw_data, 0, strpos($raw_data, "\r\n"));
    if (empty($first_line)) return ['data' => [], 'files' => []];
    
    $parts = explode($first_line, $raw_data);
    $data = [];
    $files = [];
    
    foreach ($parts as $part) {
        $part = trim($part);
        if (empty($part) || $part === '--') continue;
        
        list($raw_headers, $body) = explode("\r\n\r\n", $part, 2);
        
        // Parse headers
        $headers = [];
        foreach (explode("\r\n", $raw_headers) as $header) {
            if (empty($header) || !strpos($header, ':')) continue;
            list($name, $value) = explode(':', $header, 2);
            $headers[strtolower(trim($name))] = trim($value);
        }
        
        if (isset($headers['content-disposition'])) {
            preg_match('/name="([^"]+)"/', $headers['content-disposition'], $matches);
            $name = $matches[1] ?? null;
            if (!$name) continue;
            
            // Check if file
            if (preg_match('/filename="([^"]+)"/', $headers['content-disposition'], $file_matches)) {
                $filename = $file_matches[1];
                if (empty($filename)) continue;
                
                $tmp_name = tempnam(sys_get_temp_dir(), 'php_put_');
                file_put_contents($tmp_name, $body);
                $files[$name] = [
                    'name' => $filename,
                    'type' => $headers['content-type'] ?? 'application/octet-stream',
                    'tmp_name' => $tmp_name,
                    'error' => 0,
                    'size' => strlen($body),
                ];
            } else {
                $data[$name] = $body;
            }
        }
    }
    return ['data' => $data, 'files' => $files];
}
