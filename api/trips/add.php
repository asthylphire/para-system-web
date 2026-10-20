<?php
// POST api/trips/add.php
// {originName, originLat, originLng, destName, destLat, destLng, transport, passenger}
// The fare and ETA are recomputed on the server; the client's numbers are never trusted.
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../fare_logic.php';
require_post();
$uid = require_login();

$r   = clean_route(input());
$fare = compute_fare($r['origin']['lat'], $r['origin']['lng'], $r['dest']['lat'], $r['dest']['lng'],
                     $r['transport'], $r['passenger']);

$s = db()->prepare('INSERT INTO trips
    (user_id, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng,
     transport_code, passenger_code, distance_km, total_fare, duration_min)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$s->execute([$uid, $r['origin']['name'], $r['origin']['lat'], $r['origin']['lng'],
             $r['dest']['name'], $r['dest']['lat'], $r['dest']['lng'],
             $r['transport'], $r['passenger'], $fare['distanceKm'], $fare['total'], $fare['durationMin']]);

ok(['trip' => ['id' => (int) db()->lastInsertId()], 'fare' => $fare['fare']], 201);
