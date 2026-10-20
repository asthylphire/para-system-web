<?php
// POST api/landmarks/update.php  {id, name, category, description}
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

$in = input();
$id = valid_id($in['id'] ?? null);
$l  = clean_landmark($in, false);

// "AND user_id = ?" means users can only edit their OWN landmarks
$s = db()->prepare('UPDATE landmarks SET name = ?, category = ?, description = ? WHERE id = ? AND user_id = ?');
$s->execute([$l['name'], $l['category'], $l['description'], $id, $uid]);
if ($s->rowCount() === 0) fail(404, 'Landmark not found.');

ok(['landmark' => ['id' => $id, 'name' => $l['name'], 'category' => $l['category'], 'description' => $l['description']]]);
