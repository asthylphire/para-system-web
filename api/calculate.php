<?php
// GET api/calculate.php?olat=&olng=&dlat=&dlng=&transport=&passenger=
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/fare_logic.php';
require_method('GET');

$q = $_GET;
$errors = [];
foreach (['olat' => [-90, 90], 'dlat' => [-90, 90], 'olng' => [-180, 180], 'dlng' => [-180, 180]] as $k => [$min, $max]) {
    if (!isset($q[$k]) || !is_numeric($q[$k]) || $q[$k] < $min || $q[$k] > $max) $errors[$k] = 'Invalid coordinate.';
}
$transport = (string)($q['transport'] ?? '');
$passenger = (string)($q['passenger'] ?? '');
if ($transport === '') $errors['transport'] = 'Transport type is required.';
if ($passenger === '') $errors['passenger'] = 'Passenger type is required.';
if ($errors) fail(422, 'Invalid request.', $errors);

$r = compute_fare((float)$q['olat'], (float)$q['olng'], (float)$q['dlat'], (float)$q['dlng'], $transport, $passenger);
ok(['fare' => $r['fare']]);
