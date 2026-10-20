<?php
// POST api/trips/delete.php  {id}
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

$id = valid_id(input()['id'] ?? null);
$s = db()->prepare('DELETE FROM trips WHERE id = ? AND user_id = ?');
$s->execute([$id, $uid]);
if ($s->rowCount() === 0) fail(404, 'Trip not found.');

ok();
