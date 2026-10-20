<?php
// Shared helpers: JSON responses, sessions, CSRF, validation, error handling.
// Every endpoint starts with: require_once __DIR__ . '/helpers.php';  (../helpers.php in subfolders)

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Never show PHP errors to users; log them instead (api/logs/error.log)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/logs/error.log');
error_reporting(E_ALL);

require_once __DIR__ . '/config/db.php';

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,       // JS cannot read the session cookie
    'samesite' => 'Lax',
    'secure'   => !empty($_SERVER['HTTPS']),
]);
session_start();

// ---------- JSON responses ----------
function respond(array $data, int $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function ok(array $data = [], int $status = 200) {
    respond(['success' => true] + $data, $status);
}
function fail(int $status, string $message, array $errors = []) {
    $out = ['success' => false, 'message' => $message];
    if ($errors) $out['errors'] = $errors;
    respond($out, $status);
}

// ---------- Global error handling ----------
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail(500, 'Something went wrong on the server. Please try again.');
});
set_error_handler(function ($no, $str, $file, $line) {
    throw new ErrorException($str, 0, $no, $file, $line);
});

// ---------- Request helpers ----------
function require_method(string $method) {
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        fail(405, 'Method not allowed.');
    }
}

// Reads JSON bodies (fetch/$.ajax with JSON) or normal form posts ($.post)
function input(): array {
    static $data = null;
    if ($data !== null) return $data;
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') !== false) {
        $decoded = json_decode(file_get_contents('php://input'), true);
        if (!is_array($decoded)) fail(400, 'Invalid JSON body.');
        $data = $decoded;
    } else {
        $data = $_POST;
    }
    return $data;
}

// ---------- CSRF ----------
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function require_csrf() {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        fail(403, 'Invalid or missing security token. Refresh the page and try again.');
    }
}
// Every request that changes data: POST + valid CSRF token
function require_post() {
    require_method('POST');
    require_csrf();
}

// ---------- Auth ----------
function require_login(): int {
    if (empty($_SESSION['user_id'])) fail(401, 'Please log in first.');
    return (int) $_SESSION['user_id'];
}

// ---------- Validation ----------
const SJDM_LAT = [14.68, 14.88];
const SJDM_LNG = [121.01, 121.17];
const CATEGORIES = ['school','hospital','terminal','market','church','park','food','other'];

function valid_id($value): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) fail(422, 'Invalid id.');
    return $id;
}

function clean_landmark(array $in, bool $needCoords): array {
    $errors   = [];
    $name     = trim((string)($in['name'] ?? ''));
    $category = (string)($in['category'] ?? 'other');
    $desc     = trim((string)($in['description'] ?? ''));

    if ($name === '' || mb_strlen($name) > 150) $errors['name'] = 'Name is required (max 150 characters).';
    if (!in_array($category, CATEGORIES, true))  $errors['category'] = 'Invalid category.';
    if (mb_strlen($desc) > 500)                  $errors['description'] = 'Description is too long (max 500 characters).';

    $lat = $lng = null;
    if ($needCoords) {
        $lat = $in['lat'] ?? null;
        $lng = $in['lng'] ?? null;
        if (!is_numeric($lat) || $lat < SJDM_LAT[0] || $lat > SJDM_LAT[1]) $errors['lat'] = 'Latitude is outside San Jose del Monte.';
        if (!is_numeric($lng) || $lng < SJDM_LNG[0] || $lng > SJDM_LNG[1]) $errors['lng'] = 'Longitude is outside San Jose del Monte.';
    }

    if ($errors) fail(422, 'Please fix the highlighted fields.', $errors);
    return [
        'name' => $name, 'category' => $category, 'description' => $desc,
        'lat' => $lat === null ? null : (float)$lat,
        'lng' => $lng === null ? null : (float)$lng,
    ];
}

// Validates the route fields shared by trips and favorite routes.
// Expected keys: originName, originLat, originLng, destName, destLat, destLng, transport, passenger
function clean_route(array $in): array {
    $errors = [];
    $r = [];
    foreach (['origin', 'dest'] as $p) {
        $name = trim((string)($in[$p . 'Name'] ?? ''));
        $lat  = $in[$p . 'Lat'] ?? null;
        $lng  = $in[$p . 'Lng'] ?? null;
        if ($name === '' || mb_strlen($name) > 200) $errors[$p . 'Name'] = 'Place name is required (max 200 characters).';
        if (!is_numeric($lat) || $lat < SJDM_LAT[0] || $lat > SJDM_LAT[1]) $errors[$p . 'Lat'] = 'Latitude is outside San Jose del Monte.';
        if (!is_numeric($lng) || $lng < SJDM_LNG[0] || $lng > SJDM_LNG[1]) $errors[$p . 'Lng'] = 'Longitude is outside San Jose del Monte.';
        $r[$p] = ['name' => $name, 'lat' => (float)$lat, 'lng' => (float)$lng];
    }
    $transport = (string)($in['transport'] ?? '');
    $passenger = (string)($in['passenger'] ?? '');
    if ($transport === '' || strlen($transport) > 30) $errors['transport'] = 'Transport type is required.';
    if ($passenger === '' || strlen($passenger) > 20) $errors['passenger'] = 'Passenger type is required.';

    if ($errors) fail(422, 'Please fix the highlighted fields.', $errors);
    return $r + ['transport' => $transport, 'passenger' => $passenger];
}
