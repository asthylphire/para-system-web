<?php
// GET api/landmarks/list.php -> the logged-in user's landmarks
require_once __DIR__ . '/../helpers.php';
require_method('GET');
$uid = require_login();

$s = db()->prepare('SELECT id, name, category, description, lat, lng, created_at
                    FROM landmarks WHERE user_id = ? ORDER BY created_at DESC');
$s->execute([$uid]);

$rows = array_map(fn($r) => [
    'id' => (int)$r['id'], 'name' => $r['name'], 'category' => $r['category'],
    'description' => $r['description'] ?? '', 'lat' => (float)$r['lat'], 'lng' => (float)$r['lng'],
    'createdAt' => $r['created_at'],
], $s->fetchAll());

ok(['landmarks' => $rows]);
