<?php
// PHP Built-in Server Router for Champion Sports (Root Mode)

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$docRoot = $_SERVER['DOCUMENT_ROOT'];

// Default path if empty
if ($uri === '' || $uri === '/') {
    $uri = '/index.html';
}

$filePath = $docRoot . $uri;

// If it's a real file, serve it directly
if (file_exists($filePath) && !is_dir($filePath)) {
    if (pathinfo($filePath, PATHINFO_EXTENSION) === 'php') {
        $_SERVER['SCRIPT_FILENAME'] = $filePath;
        $_SERVER['SCRIPT_NAME'] = $uri;
        include $filePath;
        return true;
    }
    // Return false to let the built-in server handle static files natively
    return false;
}

// Strip leading slash for regex matching
$matchPath = ltrim($uri, '/');

// Route React Frontend Admin API endpoints
if (preg_match('#^api/overlay-slides/match/([0-9]+)/?$#', $matchPath, $matches)) {
    $_GET['matchId'] = $matches[1];
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/overlay-slides/active/?$#', $matchPath)) {
    $_GET['active'] = 1;
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/overlay-slides/deactivate/?$#', $matchPath)) {
    $_GET['action'] = 'deactivate-all';
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/overlay-slides/([0-9]+)/activate/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'activate';
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/overlay-slides/([0-9]+)/layout/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'layout';
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/overlay-slides/([0-9]+)/canvas-layout/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'canvas-layout';
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/overlay-slides/([0-9]+)/title/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'title';
    include $docRoot . '/api/overlay-slides.php';
    return true;
}
if (preg_match('#^api/matches/([0-9]+)/complete/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'complete';
    include $docRoot . '/api/matches.php';
    return true;
}
if (preg_match('#^api/players/([0-9]+)/photo/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'photo';
    include $docRoot . '/api/players.php';
    return true;
}
if (preg_match('#^api/players/([0-9]+)/assign-team/([0-9]+)/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'assign-team';
    $_GET['teamId'] = $matches[2];
    include $docRoot . '/api/players.php';
    return true;
}
if (preg_match('#^api/players/([0-9]+)/remove-team/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'remove-team';
    include $docRoot . '/api/players.php';
    return true;
}
if (preg_match('#^api/teams/([0-9]+)/logo/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    $_GET['action'] = 'logo';
    include $docRoot . '/api/teams.php';
    return true;
}
if (preg_match('#^api/v1/get/events(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['sportId'] = $matches[1];
    }
    include $docRoot . '/api/developer/events.php';
    return true;
}
if (preg_match('#^api/v1/get/series(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['sportId'] = $matches[1];
    }
    include $docRoot . '/api/developer/series.php';
    return true;
}
if (preg_match('#^api/v1/get/bookmaker(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['eventId'] = $matches[1];
    }
    include $docRoot . '/api/developer/bookmaker.php';
    return true;
}
if (preg_match('#^api/v1/get/odds(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['eventId'] = $matches[1];
    }
    include $docRoot . '/api/developer/odds.php';
    return true;
}
if (preg_match('#^api/v1/get/sessions(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['eventId'] = $matches[1];
    }
    include $docRoot . '/api/developer/sessions.php';
    return true;
}
if (preg_match('#^api/v1/get/toss(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['eventId'] = $matches[1];
    }
    include $docRoot . '/api/developer/toss.php';
    return true;
}
if (preg_match('#^api/v1/get/tied(?:/([0-9]+))?$#', $matchPath, $matches)) {
    if (isset($matches[1])) {
        $_GET['eventId'] = $matches[1];
    }
    include $docRoot . '/api/developer/tied.php';
    return true;
}
if (preg_match('#^api/v1/result/session_result(?:\.php)?$#', $matchPath)) {
    include $docRoot . '/api/developer/session_result.php';
    return true;
}
if (preg_match('#^tv(?:\.php)?$#', $matchPath)) {
    include $docRoot . '/api/developer/tv.php';
    return true;
}
if (preg_match('#^score(?:\.php)?$#', $matchPath)) {
    include $docRoot . '/api/developer/score.php';
    return true;
}

if (preg_match('#^api/content/key/([^/]+)/?$#', $matchPath, $matches)) {
    $_GET['key'] = $matches[1];
    include $docRoot . '/api/content.php';
    return true;
}

if (preg_match('#^api/admin/developer-keys/([0-9]+)/toggle/?$#', $matchPath, $matches)) {
    $_GET['action'] = 'toggle';
    $_GET['id'] = $matches[1];
    include $docRoot . '/api/developer-keys.php';
    return true;
}
if (preg_match('#^api/admin/developer-keys/([0-9]+)/permissions/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    include $docRoot . '/api/developer-keys.php';
    return true;
}
if (preg_match('#^api/admin/developer-keys/([0-9]+)/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[1];
    include $docRoot . '/api/developer-keys.php';
    return true;
}
if (preg_match('#^api/admin/developer-keys/?$#', $matchPath)) {
    include $docRoot . '/api/developer-keys.php';
    return true;
}

// General resource API routing: api/([a-zA-Z0-9\-]+)/([0-9]+)/?
if (preg_match('#^api/([a-zA-Z0-9\-]+)/([0-9]+)/?$#', $matchPath, $matches)) {
    $_GET['id'] = $matches[2];
    $apiFile = $docRoot . '/api/' . $matches[1] . '.php';
    if (file_exists($apiFile)) {
        include $apiFile;
        return true;
    }
}
// General resource API routing: api/([a-zA-Z0-9\-]+)/?
if (preg_match('#^api/([a-zA-Z0-9\-]+)/?$#', $matchPath, $matches)) {
    $apiFile = $docRoot . '/api/' . $matches[1] . '.php';
    if (file_exists($apiFile)) {
        include $apiFile;
        return true;
    }
}

// Fallback to index.html for React Router client-side routing
if (strpos($matchPath, 'api/') !== 0) {
    include $docRoot . '/index.html';
    return true;
}

return false;
