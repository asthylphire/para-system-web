<?php
// GET api/favorites/list.php
require_once __DIR__ . '/../helpers.php';
require_method('GET');
$uid = require_login();

$s = db()->prepare('SELECT f.id, f.label, f.origin_name, f.origin_lat, f.origin_lng,
                           f.dest_name, f.dest_lat, f.dest_lng,
                           f.transport_code, tt.label AS transport_label,
                           f.passenger_code, pt.label AS passenger_label, f.created_at
                    FROM favorite_routes f
                    JOIN transport_types tt ON tt.code = f.transport_code
                    JOIN passenger_types pt ON pt.code = f.passenger_code
                    WHERE f.user_id = ?
                    ORDER BY f.created_at DESC, f.id DESC');
$s->execute([$uid]);

$rows = array_map(fn($r) => [
    'id'         => (int)$r['id'], 'label' => $r['label'],
    'originName' => $r['origin_name'], 'originLat' => (float)$r['origin_lat'], 'originLng' => (float)$r['origin_lng'],
    'destName'   => $r['dest_name'],   'destLat'   => (float)$r['dest_lat'],   'destLng'   => (float)$r['dest_lng'],
    'transport'  => $r['transport_code'], 'transportLabel' => $r['transport_label'],
    'passenger'  => $r['passenger_code'], 'passengerLabel' => $r['passenger_label'],
    'createdAt'  => $r['created_at'],
], $s->fetchAll());

ok(['favorites' => $rows]);
