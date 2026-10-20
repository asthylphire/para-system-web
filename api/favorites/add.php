<?php
// POST api/favorites/add.php
// {label, originName, originLat, originLng, destName, destLat, destLng, transport, passenger}
require_once __DIR__ . '/../helpers.php';
require_post();
$uid = require_login();

const MAX_FAVORITES = 20;

$in    = input();
$label = trim((string)($in['label'] ?? ''));
if ($label === '' || mb_strlen($label) > 100) fail(422, 'Please fix the highlighted fields.', ['label' => 'Label is required (max 100 characters).']);
$r = clean_route($in);

$c = db()->prepare('SELECT COUNT(*) FROM favorite_routes WHERE user_id = ?');
$c->execute([$uid]);
if ((int)$c->fetchColumn() >= MAX_FAVORITES) fail(409, 'You can save up to ' . MAX_FAVORITES . ' favorite routes. Delete one first.');

try {
    $s = db()->prepare('INSERT INTO favorite_routes
        (user_id, label, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, transport_code, passenger_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $s->execute([$uid, $label, $r['origin']['name'], $r['origin']['lat'], $r['origin']['lng'],
                 $r['dest']['name'], $r['dest']['lat'], $r['dest']['lng'], $r['transport'], $r['passenger']]);
} catch (PDOException $e) {
    // 1452 = foreign key failed (unknown transport/passenger code)
    if ((int)$e->errorInfo[1] === 1452) fail(422, 'Invalid transport or passenger type.');
    throw $e;
}

ok(['favorite' => ['id' => (int) db()->lastInsertId(), 'label' => $label]], 201);
