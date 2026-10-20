<?php
// POST api/trips/clear.php -> deletes ALL of the user's trip history
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

$s = db()->prepare('DELETE FROM trips WHERE user_id = ?');
$s->execute([$uid]);

ok(['deleted' => $s->rowCount()]);
