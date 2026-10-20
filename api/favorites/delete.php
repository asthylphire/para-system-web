<?php
// POST api/favorites/delete.php  {id}
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

$id = valid_id(input()['id'] ?? null);
$s = db()->prepare('DELETE FROM favorite_routes WHERE id = ? AND user_id = ?');
$s->execute([$id, $uid]);
if ($s->rowCount() === 0) fail(404, 'Favorite route not found.');

ok();
