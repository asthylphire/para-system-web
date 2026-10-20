<?php
// GET api/trips/list.php -> the user's 50 most recent trips
require_once __DIR__ . '/../helpers.php';
require_method('GET');
$uid = require_login();

$s = db()->prepare('SELECT t.id, t.origin_name, t.origin_lat, t.origin_lng,
                           t.dest_name, t.dest_lat, t.dest_lng,
                           t.transport_code, tt.label AS transport_label,
                           t.passenger_code, pt.label AS passenger_label,
                           t.distance_km, t.total_fare, t.duration_min, t.created_at
                    FROM trips t
                    JOIN transport_types tt ON tt.code = t.transport_code
                    JOIN passenger_types pt ON pt.code = t.passenger_code
                    WHERE t.user_id = ?
                    ORDER BY t.created_at DESC, t.id DESC
                    LIMIT 50');
$s->execute([$uid]);

$rows = array_map(fn($r) => [
    'id'             => (int)$r['id'],
    'originName'     => $r['origin_name'], 'originLat' => (float)$r['origin_lat'], 'originLng' => (float)$r['origin_lng'],
    'destName'       => $r['dest_name'],   'destLat'   => (float)$r['dest_lat'],   'destLng'   => (float)$r['dest_lng'],
    'transport'      => $r['transport_code'], 'transportLabel' => $r['transport_label'],
    'passenger'      => $r['passenger_code'], 'passengerLabel' => $r['passenger_label'],
    'distanceKm'     => (float)$r['distance_km'],
    'totalFare'      => (float)$r['total_fare'],
    'durationMin'    => (int)$r['duration_min'],
    'createdAt'      => $r['created_at'],
], $s->fetchAll());

ok(['trips' => $rows]);
