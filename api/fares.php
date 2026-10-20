<?php
// GET api/fares.php -> the fare matrix (replaces assets/fare-matrix.json)
require_once __DIR__ . '/helpers.php';
require_method('GET');

$types = [];
foreach (db()->query('SELECT code, label, base_fare, base_km, excess_per_km, avg_speed_kph FROM transport_types') as $r) {
    $types[$r['code']] = [
        'label'       => $r['label'],
        'baseFare'    => (float)$r['base_fare'],
        'baseKm'      => (float)$r['base_km'],
        'excessPerKm' => (float)$r['excess_per_km'],
        'avgSpeedKph' => (float)$r['avg_speed_kph'],
    ];
}
$discounts = [];
foreach (db()->query('SELECT code, label, discount_rate FROM passenger_types') as $r) {
    $discounts[$r['code']] = ['label' => $r['label'], 'rate' => (float)$r['discount_rate']];
}

ok(['types' => $types, 'discounts' => $discounts]);
