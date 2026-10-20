<?php
// POST api/auth/logout.php
require_once __DIR__ . '/../helpers.php';
require_post();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $c = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $c['path'], $c['domain'], $c['secure'], $c['httponly']);
}
session_destroy();

ok();   // front end should call me.php again to get a fresh CSRF token
