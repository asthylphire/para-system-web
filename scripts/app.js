// STATE
let originData = null;
let destData = null;
let pendingLandmarkPos = null;
let currentViewLandmarkId = null;
let tripsCache = [];
let favoritesCache = [];
const searchTimers = {};

function firstName(text) {
    return String(text || '').split(',')[0].trim();
}

// NOTIFICATIONS
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'notification ' + type;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => {
        div.classList.add('hiding');
        setTimeout(() => div.remove(), 350);
    }, 3500);
}

// DARK MODE
function applyDarkMode() {
    const isDark = localStorage.getItem('para_dark') === 'true';
    document.body.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    syncToggleKnob(isDark);
}

function setupDarkToggle() {
    const btn = document.getElementById('dark-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
        const isDark = document.body.classList.toggle('dark');
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('para_dark', String(isDark));
        syncToggleKnob(isDark);
        this.setAttribute('aria-pressed', String(isDark));
    });
}

function syncToggleKnob(isDark) {
    const knob = document.querySelector('#dark-toggle .toggle-knob');
    if (!knob) return;
    knob.classList.toggle('is-dark', isDark);
    const icon = knob.querySelector('img');
    if (icon) {
        icon.src = isDark
            ? '../assets/dark-icon.png'
            : '../assets/light-icon.png';
    }
}

// SIDEBAR
function setupSidebar() {
    const openBtn = document.getElementById('hamburger-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close');
    openBtn?.addEventListener('click', () => overlay?.classList.add('active'));
    closeBtn?.addEventListener('click', () => overlay?.classList.remove('active'));
    overlay?.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
}

// SCROLL ANIMATIONS
function setupScrollAnimations() {
    const observer = new IntersectionObserver(
        entries => entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        }),
        { threshold: 0.15 }
    );
    document.querySelectorAll('.anim-on-scroll').forEach(el => observer.observe(el));
}

// BACK TO TOP
function setupBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
        btn.classList.toggle('active', window.scrollY > 400);
    });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// AUTH NAV (state comes from the server session, see auth.js)
function updateNavAuth() {
    const user = Auth.getCurrentUser();
    const areas = [
        { el: document.getElementById('nav-auth-area'), kind: 'nav' },
        { el: document.getElementById('sidebar-auth-area'), kind: 'sidebar' }
    ].filter(x => x.el);
    if (!areas.length) return;
    for (const { el, kind } of areas) {
        el.innerHTML = '';
        if (user) {
            const btn = document.createElement('button');
            btn.className = kind === 'sidebar' ? 'sidebar-auth-btn' : 'nav-auth-btn';
            btn.type = 'button';
            btn.textContent = 'Log Out';
            btn.addEventListener('click', doLogout);
            el.appendChild(btn);
        } else {
            const a = document.createElement('a');
            a.href = 'auth.html';
            a.className = kind === 'sidebar' ? 'sidebar-auth-btn' : 'nav-auth-btn';
            a.textContent = 'Log In';
            el.appendChild(a);
        }
    }
}

async function doLogout() {
    try {
        await Auth.logout();
    } catch (err) {
        showNotification(API.describe(err), 'error');
        return;
    }
    showNotification('Logged out. See you soon!', 'info');
    updateNavAuth();
    DataManager.reset();
    tripsCache = [];
    favoritesCache = [];
    if (typeof renderSavedLandmarks === 'function') renderSavedLandmarks();
    renderLandmarksList();
    renderTripsList();
    renderFavoritesList();
    closeAllPanels();
}

// MODAL HELPERS
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function setupModalOverlayClose() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
}

function setupEscKey() {
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open')
                    .forEach(m => closeModal(m.id));
            closeAllPanels();
        }
    });
}

// LOCATION SEARCH
function setupSearchInput(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;
    input.addEventListener('input', function () {
        const query = this.value.trim();
        clearTimeout(searchTimers[inputId]);
        if (query.length < 2) {
            dropdown.classList.remove('open');
            dropdown.innerHTML = '';
            return;
        }
        searchTimers[inputId] = setTimeout(async () => {
            dropdown.innerHTML = '<div class="search-dropdown-item loading">Searching...</div>';
            dropdown.classList.add('open');
            const results = await searchLocations(query);
            if (!results.length) {
                dropdown.innerHTML = '<div class="search-dropdown-item">No results found</div>';
                return;
            }
            dropdown.innerHTML = results.map(r =>
                '<div class="search-dropdown-item"' +
                ' data-lat="' + r.lat + '"' +
                ' data-lng="' + r.lng + '"' +
                ' data-name="' + escapeHtml(r.name) + '">' +
                '<i class="fi fi-rr-marker item-icon" aria-hidden="true"></i>' +
                '<span>' + escapeHtml(r.name) + '</span>' +
                '</div>'
            ).join('');
            dropdown.querySelectorAll('.search-dropdown-item').forEach(item => {
                item.addEventListener('click', function () {
                    const loc = {
                        name: this.dataset.name,
                        lat: parseFloat(this.dataset.lat),
                        lng: parseFloat(this.dataset.lng)
                    };
                    input.value = loc.name;
                    dropdown.classList.remove('open');
                    dropdown.innerHTML = '';
                    onSelect(loc);
                });
            });
        }, 420);
    });
    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

// CALCULATE PAGE
function setupCalcListeners() {
    setupSearchInput('origin-input', 'origin-dropdown', loc => {
        originData = loc;
        setOriginMarker(loc.lat, loc.lng, firstName(loc.name));
        refreshFareCalculation();
    });
    setupSearchInput('dest-input', 'dest-dropdown', loc => {
        destData = loc;
        setDestinationMarker(loc.lat, loc.lng, firstName(loc.name));
        refreshFareCalculation();
    });

    $('#swap-btn').on('click', () => {
        [originData, destData] = [destData, originData];
        const $o = $('#origin-input');
        const $d = $('#dest-input');
        const tmp = $o.val();
        $o.val($d.val());
        $d.val(tmp);
        if (originData) setOriginMarker(originData.lat, originData.lng, firstName(originData.name));
        if (destData) setDestinationMarker(destData.lat, destData.lng, firstName(destData.name));
        refreshFareCalculation();
    });

    $('#transport-select, #passenger-select').on('change', refreshFareCalculation);

    setupPanels();
    setupLandmarkList();
    setupTrips();
    setupFavorites();
}

// FARE CALCULATION (the server does the maths: api/calculate.php)
let fareTimer = null;
let fareRequestId = 0;
let lastWarnKey = '';

// Debounced, so swap/select changes that fire several updates only cause one request
function refreshFareCalculation() {
    clearTimeout(fareTimer);
    fareTimer = setTimeout(runFareCalculation, 150);
}

function setResultVisible(visible) {
    $('#result-card').toggleClass('active', visible);
    $('#para-hint').css('display', visible ? 'none' : 'flex');
}

async function runFareCalculation() {
    if (!$('#result-card').length) return;
    const transport = $('#transport-select').val();
    const passenger = $('#passenger-select').val();
    const $hint = $('#para-hint-text');

    if (!originData || !destData) {
        $hint.html('<strong>Select an origin and destination to see the fare!</strong>');
        setResultVisible(false);
        return;
    }
    if (!transport || !passenger) {
        $hint.html('<strong>Now choose a transport type and passenger type!</strong>');
        setResultVisible(false);
        return;
    }

    const myId = ++fareRequestId;
    $hint.text('Calculating your fare...');
    try {
        const fare = await fetchFare(originData, destData, transport, passenger);
        if (myId !== fareRequestId) return;       // a newer request replaced this one

        $('#res-origin').text(firstName(originData.name));
        $('#res-dest').text(firstName(destData.name));
        $('#res-distance').text(fare.distance + ' km');
        $('#res-eta').text('~' + fare.durationMin + ' min (arrive ~' + fare.arrivalTime + ')');
        $('#res-base').text('₱' + fare.baseFare);
        $('#res-excess').text('₱' + fare.excessFare);
        $('#res-ptype').text(fare.passengerType);
        $('#res-discount').text(fare.discountRate > 0
            ? '-₱' + fare.discountAmount + ' (' + fare.discountRate + '% off)'
            : 'None');
        $('#res-total').text('₱' + fare.total);
        setResultVisible(true);

        const key = [originData.lat, originData.lng, destData.lat, destData.lng].join(',');
        if (fare.farDestination && key !== lastWarnKey) {
            showNotification('Far destination! A Tricycle Special Trip may be needed.', 'warning');
        }
        lastWarnKey = fare.farDestination ? key : '';
    } catch (err) {
        if (myId !== fareRequestId) return;
        setResultVisible(false);
        $hint.text('Could not calculate the fare. ' + API.describe(err));
        showNotification(API.describe(err), 'error');
    }
}

// The route currently on screen, in the shape the backend expects (or null if incomplete)
function getCurrentRoute() {
    const transport = $('#transport-select').val();
    const passenger = $('#passenger-select').val();
    if (!originData || !destData || !transport || !passenger) return null;
    return {
        originName: firstName(originData.name), originLat: originData.lat, originLng: originData.lng,
        destName: firstName(destData.name), destLat: destData.lat, destLng: destData.lng,
        transport: transport, passenger: passenger
    };
}

// Loads a saved trip / favorite back onto the map and the dropdowns
function applySavedRoute(r) {
    originData = { name: r.originName, lat: r.originLat, lng: r.originLng };
    destData = { name: r.destName, lat: r.destLat, lng: r.destLng };
    $('#origin-input').val(r.originName);
    $('#dest-input').val(r.destName);
    $('#transport-select').val(r.transport);
    $('#passenger-select').val(r.passenger);
    setOriginMarker(originData.lat, originData.lng, firstName(originData.name));
    setDestinationMarker(destData.lat, destData.lng, firstName(destData.name));
    refreshFareCalculation();
}

// DROPDOWN PANELS (Favorites / Recent Trips / My Landmarks)
function closeAllPanels() {
    $('.landmarks-panel').removeClass('open');
    $('.overlay-item > button').attr('aria-expanded', 'false');
}

function setupPanels() {
    const panels = [
        { btn: '#favorites-toggle-btn', panel: '#favorites-panel', onOpen: loadFavorites },
        { btn: '#trips-toggle-btn', panel: '#trips-panel', onOpen: loadTrips },
        { btn: '#landmarks-toggle-btn', panel: '#landmarks-panel', onOpen: () => {
            renderLandmarksList();
            $('#landmarks-search').trigger('focus');
        } }
    ];
    panels.forEach(p => {
        $(p.btn).on('click', function (e) {
            e.stopPropagation();
            const willOpen = !$(p.panel).hasClass('open');
            closeAllPanels();
            if (willOpen) {
                $(p.panel).addClass('open');
                $(this).attr('aria-expanded', 'true');
                p.onOpen();
            }
        });
    });
    $(document).on('click', e => {
        if (!$(e.target).closest('.overlay-item').length) closeAllPanels();
    });
}

// LANDMARKS LIST
function setupLandmarkList() {
    $('#landmarks-search').on('input', function () {
        renderLandmarksList(this.value.trim().toLowerCase());
    });
    $('#landmarks-list').on('click', '.landmark-list-item', function (e) {
        e.stopPropagation();
        onLandmarkListClick($(this).data('id'));
    });
}

function renderLandmarksList(filter = '') {
    const $list = $('#landmarks-list');
    if (!$list.length) return;
    if (!Auth.isLoggedIn()) {
        $list.html('<div class="lm-empty">Please <a href="auth.html">log in</a> to save landmarks.</div>');
        return;
    }
    const all = DataManager.getLandmarks();
    const filtered = filter
        ? all.filter(lm => lm.name.toLowerCase().includes(filter) || lm.category.toLowerCase().includes(filter))
        : all;
    if (!filtered.length) {
        $list.html('<div class="lm-empty">No landmarks yet.<br>Right-click the map to add one!</div>');
        return;
    }
    $list.empty();
    filtered.forEach(lm => {
        $('<div class="landmark-list-item">').attr('data-id', lm.id).append(
            '<i class="fi fi-rr-marker lm-icon" aria-hidden="true"></i>',
            $('<div class="lm-info">').append(
                $('<h5>').text(lm.name),
                $('<span>').text(lm.category)
            )
        ).appendTo($list);
    });
}

function onLandmarkListClick(id) {
    const lm = DataManager.getLandmark(id);
    if (!lm) return;
    panToLandmark(lm);
    closeAllPanels();
    openViewLandmarkModal(id);
}

// ADD LANDMARK
function openAddLandmarkModal(lat, lng) {
    pendingLandmarkPos = { lat, lng };
    document.getElementById('lm-name').value = '';
    document.getElementById('lm-category').value = 'other';
    document.getElementById('lm-desc').value = '';
    openModal('add-landmark-modal');
}

async function submitAddLandmark() {
    const name = document.getElementById('lm-name')?.value.trim();
    const category = document.getElementById('lm-category')?.value;
    const desc = document.getElementById('lm-desc')?.value.trim();
    if (!name) {
        showNotification('Please enter a landmark name.', 'warning');
        return;
    }
    if (!pendingLandmarkPos) return;
    try {
        const lm = await DataManager.addLandmark(name, category, desc, pendingLandmarkPos.lat, pendingLandmarkPos.lng);
        addLandmarkMarker(lm);
        renderLandmarksList();
        closeModal('add-landmark-modal');
        showNotification('"' + name + '" added to your landmarks!', 'success');
        pendingLandmarkPos = null;
    } catch (err) {
        showNotification(API.describe(err), 'error');
    }
}

// VIEW LANDMARK
function openViewLandmarkModal(id) {
    const lm = DataManager.getLandmark(id);
    if (!lm) return;
    currentViewLandmarkId = lm.id;
    document.getElementById('view-lm-name').textContent = lm.name;
    document.getElementById('view-lm-category').textContent =
        lm.category.charAt(0).toUpperCase() + lm.category.slice(1);
    document.getElementById('view-lm-desc').textContent = lm.description || '—';
    openModal('view-landmark-modal');
}

async function deleteLandmarkConfirm() {
    if (!currentViewLandmarkId) return;
    const id = currentViewLandmarkId;
    const lm = DataManager.getLandmark(id);
    const name = lm ? lm.name : 'this landmark';
    try {
        await DataManager.deleteLandmark(id);
    } catch (err) {
        showNotification(API.describe(err), 'error');
        return;
    }
    if (landmarkMarkers[id]) {
        map.removeLayer(landmarkMarkers[id]);
        delete landmarkMarkers[id];
    }
    renderLandmarksList();
    closeModal('view-landmark-modal');
    showNotification('"' + name + '" deleted.', 'info');
    currentViewLandmarkId = null;
}

// EDIT LANDMARK
function openEditLandmark() {
    if (!currentViewLandmarkId) return;
    const lm = DataManager.getLandmark(currentViewLandmarkId);
    if (!lm) return;
    document.getElementById('edit-lm-id').value = lm.id;
    document.getElementById('edit-lm-name').value = lm.name;
    document.getElementById('edit-lm-category').value = lm.category;
    document.getElementById('edit-lm-desc').value = lm.description || '';
    closeModal('view-landmark-modal');
    openModal('edit-landmark-modal');
}

async function submitEditLandmark() {
    const id = document.getElementById('edit-lm-id')?.value;
    const name = document.getElementById('edit-lm-name')?.value.trim();
    const category = document.getElementById('edit-lm-category')?.value;
    const desc = document.getElementById('edit-lm-desc')?.value.trim();
    if (!name) {
        showNotification('Please enter a landmark name.', 'warning');
        return;
    }
    try {
        await DataManager.updateLandmark(id, name, category, desc);
    } catch (err) {
        showNotification(API.describe(err), 'error');
        return;
    }
    if (landmarkMarkers[id]) {
        map.removeLayer(landmarkMarkers[id]);
        delete landmarkMarkers[id];
    }
    const updated = DataManager.getLandmark(id);
    if (updated) addLandmarkMarker(updated);
    renderLandmarksList();
    closeModal('edit-landmark-modal');
    showNotification('"' + name + '" updated!', 'success');
}

// RECENT TRIPS (api/trips/*.php)
function setupTrips() {
    $('#save-trip-btn').on('click', async function () {
        if (!Auth.isLoggedIn()) {
            showNotification('Log in to save trips.', 'warning');
            return;
        }
        const route = getCurrentRoute();
        if (!route) return;
        const $btn = $(this).prop('disabled', true);
        try {
            await API.post('trips/add.php', route);
            showNotification('Trip saved to your history!', 'success');
            if ($('#trips-panel').hasClass('open')) loadTrips();
        } catch (err) {
            showNotification(API.describe(err), 'error');
        } finally {
            $btn.prop('disabled', false);
        }
    });

    $('#trips-list').on('click', '.item-del', async function (e) {
        e.stopPropagation();
        const id = $(this).closest('.landmark-list-item').data('id');
        try {
            await API.post('trips/delete.php', { id });
            tripsCache = tripsCache.filter(t => t.id !== id);
            renderTripsList();
            showNotification('Trip removed.', 'info');
        } catch (err) {
            showNotification(API.describe(err), 'error');
        }
    });

    $('#trips-list').on('click', '.landmark-list-item', function (e) {
        e.stopPropagation();
        const trip = tripsCache.find(t => t.id === $(this).data('id'));
        if (trip) {
            applySavedRoute(trip);
            closeAllPanels();
            showNotification('Trip loaded. The fare was recalculated with current rates.', 'info');
        }
    });

    $('#trips-clear-btn').on('click', async function (e) {
        e.stopPropagation();
        if (!tripsCache.length) return;
        if (!window.confirm('Clear all of your trip history?')) return;
        try {
            await API.post('trips/clear.php');
            tripsCache = [];
            renderTripsList();
            showNotification('Trip history cleared.', 'info');
        } catch (err) {
            showNotification(API.describe(err), 'error');
        }
    });
}

async function loadTrips() {
    if (!$('#trips-list').length) return;
    if (!Auth.isLoggedIn()) { tripsCache = []; renderTripsList(); return; }
    try {
        const res = await API.get('trips/list.php');
        tripsCache = res.trips;
        renderTripsList();
    } catch (err) {
        $('#trips-list').html('<div class="lm-empty">Could not load your trips.</div>');
        showNotification(API.describe(err), 'error');
    }
}

function renderTripsList() {
    const $list = $('#trips-list');
    if (!$list.length) return;
    if (!Auth.isLoggedIn()) {
        $list.html('<div class="lm-empty">Please <a href="auth.html">log in</a> to see your recent trips.</div>');
        return;
    }
    if (!tripsCache.length) {
        $list.html('<div class="lm-empty">No saved trips yet.<br>Calculate a fare, then press "Save trip".</div>');
        return;
    }
    $list.empty();
    tripsCache.forEach(t => {
        const detail = t.transportLabel + ' · ' + t.passengerLabel + ' · ₱' + t.totalFare.toFixed(2)
            + ' · ' + t.durationMin + ' min · ' + String(t.createdAt).slice(0, 10);
        $('<div class="landmark-list-item">').attr('data-id', t.id).append(
            '<i class="fi fi-rr-time-past lm-icon" aria-hidden="true"></i>',
            $('<div class="lm-info">').append(
                $('<h5>').text(firstName(t.originName) + ' → ' + firstName(t.destName)),
                $('<span>').text(detail)
            ),
            $('<button type="button" class="item-del" title="Remove" aria-label="Remove trip">').text('×')
        ).appendTo($list);
    });
}

// FAVORITE ROUTES (api/favorites/*.php)
function setupFavorites() {
    $('#fav-btn').on('click', () => {
        if (!Auth.isLoggedIn()) {
            showNotification('Log in to save favorite routes.', 'warning');
            return;
        }
        const route = getCurrentRoute();
        if (!route) return;
        $('#fav-label').val((route.originName + ' → ' + route.destName).slice(0, 100));
        $('#fav-label-error').text('');
        openModal('add-favorite-modal');
        $('#fav-label').trigger('focus').trigger('select');
    });

    $('#fav-save-btn').on('click', async function () {
        const label = $('#fav-label').val().trim();
        if (!label) { $('#fav-label-error').text('Label is required.'); return; }
        const route = getCurrentRoute();
        if (!route) { closeModal('add-favorite-modal'); return; }
        const $btn = $(this).prop('disabled', true);
        try {
            await API.post('favorites/add.php', Object.assign({ label }, route));
            closeModal('add-favorite-modal');
            showNotification('Added to your favorites!', 'success');
            if ($('#favorites-panel').hasClass('open')) loadFavorites();
        } catch (err) {
            $('#fav-label-error').text(API.describe(err));
        } finally {
            $btn.prop('disabled', false);
        }
    });

    $('#fav-label').on('keydown', e => { if (e.key === 'Enter') $('#fav-save-btn').trigger('click'); });

    $('#favorites-list').on('click', '.item-del', async function (e) {
        e.stopPropagation();
        const id = $(this).closest('.landmark-list-item').data('id');
        try {
            await API.post('favorites/delete.php', { id });
            favoritesCache = favoritesCache.filter(f => f.id !== id);
            renderFavoritesList();
            showNotification('Favorite removed.', 'info');
        } catch (err) {
            showNotification(API.describe(err), 'error');
        }
    });

    $('#favorites-list').on('click', '.landmark-list-item', function (e) {
        e.stopPropagation();
        const fav = favoritesCache.find(f => f.id === $(this).data('id'));
        if (fav) {
            applySavedRoute(fav);
            closeAllPanels();
        }
    });
}

async function loadFavorites() {
    if (!$('#favorites-list').length) return;
    if (!Auth.isLoggedIn()) { favoritesCache = []; renderFavoritesList(); return; }
    try {
        const res = await API.get('favorites/list.php');
        favoritesCache = res.favorites;
        renderFavoritesList();
    } catch (err) {
        $('#favorites-list').html('<div class="lm-empty">Could not load your favorites.</div>');
        showNotification(API.describe(err), 'error');
    }
}

function renderFavoritesList() {
    const $list = $('#favorites-list');
    if (!$list.length) return;
    if (!Auth.isLoggedIn()) {
        $list.html('<div class="lm-empty">Please <a href="auth.html">log in</a> to see your favorite routes.</div>');
        return;
    }
    if (!favoritesCache.length) {
        $list.html('<div class="lm-empty">No favorites yet.<br>Calculate a fare, then press the star.</div>');
        return;
    }
    $list.empty();
    favoritesCache.forEach(f => {
        $('<div class="landmark-list-item">').attr('data-id', f.id).append(
            '<i class="fi fi-rr-star lm-icon" aria-hidden="true"></i>',
            $('<div class="lm-info">').append(
                $('<h5>').text(f.label),
                $('<span>').text(firstName(f.originName) + ' → ' + firstName(f.destName) + ' · ' + f.transportLabel)
            ),
            $('<button type="button" class="item-del" title="Remove" aria-label="Remove favorite">').text('×')
        ).appendTo($list);
    });
}

// PAGE START
document.addEventListener('DOMContentLoaded', () => {
    applyDarkMode();
    setupDarkToggle();
    setupSidebar();
    setupScrollAnimations();
    setupBackToTop();
    setupModalOverlayClose();
    setupEscKey();

    const isCalcPage = !!document.getElementById('origin-input');
    if (isCalcPage) {
        setupCalcListeners();
        initMap();
        loadFareOptions();
    }

    // Everything that depends on "who is logged in" waits for the server session
    Auth.ready().then(() => {
        updateNavAuth();
        if (isCalcPage) {
            renderSavedLandmarks();
            renderLandmarksList();
            renderTripsList();
            renderFavoritesList();
        }
    });
});
