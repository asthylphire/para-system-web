<?php
// POST api/landmarks/add.php  {name, category, description, lat, lng}
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

$l = clean_landmark(input(), true);

$s = db()->prepare('INSERT INTO landmarks (user_id, name, category, description, lat, lng) VALUES (?, ?, ?, ?, ?, ?)');
$s->execute([$uid, $l['name'], $l['category'], $l['description'], $l['lat'], $l['lng']]);

ok(['landmark' => ['id' => (int) db()->lastInsertId()] + $l], 201);
