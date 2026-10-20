<?php
// POST api/auth/register.php  {name, email, password}
require_once __DIR__ . '/../helpers.php';
require_post();

$in       = input();
$name     = trim((string)($in['name'] ?? ''));
$email    = strtolower(trim((string)($in['email'] ?? '')));
$password = (string)($in['password'] ?? '');

$errors = [];
if ($name === '' || mb_strlen($name) > 100)                             $errors['name'] = 'Name is required (max 100 characters).';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) $errors['email'] = 'Enter a valid email address.';
if (strlen($password) < 8)                                               $errors['password'] = 'Password must be at least 8 characters.';
elseif (strlen($password) > 72)                                          $errors['password'] = 'Password is too long (max 72 characters).';
if ($errors) fail(422, 'Please fix the highlighted fields.', $errors);

try {
    $s = db()->prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
    $s->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if ((int)$e->errorInfo[1] === 1062) fail(409, 'Email already registered.');  // UNIQUE(email)
    throw $e;
}

session_regenerate_id(true);               // prevents session fixation
$id = (int) db()->lastInsertId();
$_SESSION['user_id'] = $id;

ok(['user' => ['id' => $id, 'name' => $name, 'email' => $email], 'csrf' => csrf_token()], 201);
