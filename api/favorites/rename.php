<?php
// POST api/favorites/rename.php  {id, label}
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

$in    = input();
$id    = valid_id($in['id'] ?? null);
$label = trim((string)($in['label'] ?? ''));
if ($label === '' || mb_strlen($label) > 100) fail(422, 'Please fix the highlighted fields.', ['label' => 'Label is required (max 100 characters).']);

$s = db()->prepare('UPDATE favorite_routes SET label = ? WHERE id = ? AND user_id = ?');
$s->execute([$label, $id, $uid]);
if ($s->rowCount() === 0) fail(404, 'Favorite route not found.');

ok(['favorite' => ['id' => $id, 'label' => $label]]);
