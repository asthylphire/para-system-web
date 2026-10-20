<?php
// POST api/auth/login.php  {email, password}
require_once __DIR__ . '/../helpers.php';
require_post();

$in       = input();
$email    = strtolower(trim((string)($in['email'] ?? '')));
$password = (string)($in['password'] ?? '');
if ($email === '' || $password === '') fail(422, 'Please fill in all fields.');

$s = db()->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
$s->execute([$email]);
$u = $s->fetch();

// Same generic message whether the email or the password is wrong.
// (Dummy hash keeps response time similar when the email doesn't exist.)
$hash = $u ? $u['password_hash'] : password_hash('dummy-password', PASSWORD_DEFAULT);
if (!password_verify($password, $hash) || !$u) {
    fail(401, 'Invalid email or password.');
}

if (password_needs_rehash($u['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int)$u['id'];

ok(['user' => ['id' => (int)$u['id'], 'name' => $u['name'], 'email' => $u['email']], 'csrf' => csrf_token()]);
