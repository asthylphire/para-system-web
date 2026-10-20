// FARE ENGINE (front end). The fare, distance and ETA are now computed by the server
// (api/calculate.php), so they can't be tampered with in the browser.

// Ask the server for the fare between two points
function fetchFare(origin, dest, transport, passenger) {
    return API.get('calculate.php', {
        olat: origin.lat, olng: origin.lng,
        dlat: dest.lat, dlng: dest.lng,
        transport: transport, passenger: passenger
    }).then(res => res.fare);
}

// Fill the two dropdowns from the database (api/fares.php).
// If it fails, the static <option>s already in the HTML keep working.
function loadFareOptions() {
    return API.get('fares.php').then(res => {
        const $t = $('#transport-select');
        const $p = $('#passenger-select');

        if ($t.length) {
            const cur = $t.val();
            const $first = $t.find('option').first();
            $t.empty().append($first);
            Object.entries(res.types).forEach(([code, t]) => {
                $t.append($('<option>').val(code).text(t.label));
            });
            $t.val(cur);
        }
        if ($p.length) {
            const cur = $p.val();
            const $first = $p.find('option').first();
            $p.empty().append($first);
            Object.entries(res.discounts).forEach(([code, d]) => {
                const pct = Math.round(d.rate * 100);
                $p.append($('<option>').val(code).text(d.label + (pct > 0 ? ' (' + pct + '% off)' : '')));
            });
            $p.val(cur);
        }
    }).catch(err => console.warn('[FareEngine] Using built-in dropdown options:', err.message));
}
