<?php
// Shared fare + ETA computation. Requires helpers.php to be loaded first.

function haversine_km(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $r = 6371;
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
    return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

// Returns ['distanceKm', 'durationMin', 'total' (float), 'fare' (formatted for the UI)]
function compute_fare(float $olat, float $olng, float $dlat, float $dlng, string $transport, string $passenger): array {
    $t = db()->prepare('SELECT label, base_fare, base_km, excess_per_km, avg_speed_kph FROM transport_types WHERE code = ?');
    $t->execute([$transport]);
    $tr = $t->fetch();
    $p = db()->prepare('SELECT label, discount_rate FROM passenger_types WHERE code = ?');
    $p->execute([$passenger]);
    $pa = $p->fetch();
    if (!$tr) fail(422, 'Invalid request.', ['transport' => 'Unknown transport type.']);
    if (!$pa) fail(422, 'Invalid request.', ['passenger' => 'Unknown passenger type.']);

    $dist     = haversine_km($olat, $olng, $dlat, $dlng);
    $excessKm = max(0, $dist - (float)$tr['base_km']);
    $excess   = $excessKm * (float)$tr['excess_per_km'];
    $subtotal = (float)$tr['base_fare'] + $excess;
    $discount = $subtotal * (float)$pa['discount_rate'];
    $total    = $subtotal - $discount;

    // ETA = distance / average speed (an estimate: ignores traffic and waiting time)
    $duration = max(1, (int) round($dist / (float)$tr['avg_speed_kph'] * 60));
    $arrival  = (new DateTime('now', new DateTimeZone('Asia/Manila')))
                    ->modify('+' . $duration . ' minutes')->format('g:i A');

    $f = fn($n) => number_format($n, 2, '.', '');

    return [
        'distanceKm'  => round($dist, 2),
        'durationMin' => $duration,
        'total'       => round($total, 2),
        'fare'        => [
            'distance'       => $f($dist),
            'transportLabel' => $tr['label'],
            'baseFare'       => $f((float)$tr['base_fare']),
            'excessFare'     => $f($excess),
            'passengerType'  => $pa['label'],
            'discountRate'   => (int) round((float)$pa['discount_rate'] * 100),
            'discountAmount' => $f($discount),
            'total'          => $f($total),
            'durationMin'    => $duration,
            'arrivalTime'    => $arrival,
            'farDestination' => $dist > 8,   // Tricycle Special Trip warning
        ],
    ];
}
