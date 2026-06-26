<?php
require_once __DIR__ . '/../../includes/auth.php';

// Handle CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function getAuthorizedKey(): array {
    $db = getDB();
    
    // Check parameters
    $clientId = $_GET['clientId'] ?? $_SERVER['HTTP_X_CLIENT_ID'] ?? null;
    $token     = $_GET['token']    ?? $_SERVER['HTTP_X_TOKEN']    ?? $_SERVER['HTTP_X_API_KEY'] ?? null;
    
    if (!$clientId || !$token) {
        jsonResponse([
            'success' => false,
            'error'   => 'Unauthorized: Invalid or missing clientId and token',
            'code'    => 401
        ], 401);
    }
    
    $stmt = $db->prepare("SELECT * FROM developer_keys WHERE client_id = ? AND active = 1");
    $stmt->execute([$clientId]);
    $key = $stmt->fetch();
    
    if (!$key || $key['token'] !== $token) {
        jsonResponse([
            'success' => false,
            'error'   => 'Unauthorized: Invalid or missing clientId and token',
            'code'    => 401
        ], 401);
    }
    
    return $key;
}

function requirePermission(array $key, string $permissionName): void {
    $allowed = isset($key['allowed_apis']) ? explode(',', $key['allowed_apis']) : [];
    if (!in_array($permissionName, $allowed)) {
        jsonResponse([
            'success' => false,
            'error'   => "Forbidden: This key does not have access to the {$permissionName} API",
            'code'    => 403
        ], 403);
    }
}
