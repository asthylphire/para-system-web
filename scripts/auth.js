// AUTH (talks to api/auth/*.php; the session lives on the server)
const Auth = {
    user: null,
    _ready: null,

    // Resolves once we know who (if anyone) is logged in
    ready() {
        if (!this._ready) {
            this._ready = API.session()
                .then(res => { this.user = res.user || null; return this.user; })
                .catch(err => { console.warn('[Auth] Could not load session:', err.message); this.user = null; return null; });
        }
        return this._ready;
    },

    getCurrentUser() { return this.user; },
    isLoggedIn() { return this.user !== null; },

    async login(email, password) {
        const res = await API.post('auth/login.php', { email, password });
        API.csrf = res.csrf;
        this.user = res.user;
        return res;
    },

    async register(name, email, password) {
        const res = await API.post('auth/register.php', { name, email, password });
        API.csrf = res.csrf;
        this.user = res.user;
        return res;
    },

    async logout() {
        await API.post('auth/logout.php');
        this.user = null;
        await API.session(true).catch(() => {});   // fresh token for the new guest session
    }
};

// AUTH PAGE UI
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_FIELDS  = { email: 'login-email',  password: 'login-password' };
const SIGNUP_FIELDS = { name: 'signup-name', email: 'signup-email', password: 'signup-password' };
let authBusy = false;

function showAuthPage(page) {
    clearFieldErrors();
    ['login', 'signup', 'forgot'].forEach(p => {
        $('#auth-' + p).toggleClass('hidden', p !== page);
    });
}

function clearFieldErrors() {
    $('.field-error').remove();
    $('.auth-input-group').removeClass('has-error');
}

function showFieldErrors(errors, idMap) {
    Object.entries(errors || {}).forEach(([field, msg]) => {
        const id = idMap[field];
        if (!id) return;
        const $group = $('#' + id).closest('.auth-input-group');
        $group.addClass('has-error');
        $('<div class="field-error">').text(msg).insertAfter($group);   // .text() = safe
    });
}

function setAuthBusy(btnSelector, busy) {
    authBusy = busy;
    $(btnSelector).prop('disabled', busy);
}

async function doLogin() {
    if (authBusy) return;
    clearFieldErrors();
    const email = $('#login-email').val().trim();
    const password = $('#login-password').val();

    const errors = {};
    if (!email) errors.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    if (Object.keys(errors).length) { showFieldErrors(errors, LOGIN_FIELDS); return; }

    setAuthBusy('#login-submit', true);
    try {
        const res = await Auth.login(email, password);
        showNotification('Welcome back, ' + res.user.name + '!', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch (err) {
        showFieldErrors(err.errors, LOGIN_FIELDS);
        showNotification(API.describe(err), 'error');
        setAuthBusy('#login-submit', false);
    }
}

async function doSignup() {
    if (authBusy) return;
    clearFieldErrors();
    const name = $('#signup-name').val().trim();
    const email = $('#signup-email').val().trim();
    const password = $('#signup-password').val();
    const agree = $('#signup-agree').is(':checked');

    const errors = {};
    if (!name) errors.name = 'Name is required.';
    if (!email) errors.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (Object.keys(errors).length) { showFieldErrors(errors, SIGNUP_FIELDS); return; }
    if (!agree) { showNotification('Please agree to the Terms of Service.', 'warning'); return; }

    setAuthBusy('#signup-submit', true);
    try {
        const res = await Auth.register(name, email, password);
        showNotification('Account created! Welcome, ' + res.user.name + '!', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
    } catch (err) {
        if (err.status === 409) showFieldErrors({ email: err.message }, SIGNUP_FIELDS);
        else showFieldErrors(err.errors, SIGNUP_FIELDS);
        showNotification(API.describe(err), 'error');
        setAuthBusy('#signup-submit', false);
    }
}

function doForgot() {
    // The backend has no password-reset endpoint yet (needs an emailed token).
    showNotification('Password reset is not available yet. Please contact the Para team.', 'info');
}

function setupPwToggle(btnId, inputId, iconId) {
    $('#' + btnId).on('click', function () {
        const $input = $('#' + inputId);
        const show = $input.attr('type') === 'password';
        $input.attr('type', show ? 'text' : 'password');
        $('#' + iconId).attr('class', show ? 'fi fi-rr-eye' : 'fi fi-rr-eye-crossed');
    });
}

// AUTH PAGE SETUP (only runs on auth.html)
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('auth-login')) return;

    Auth.ready().then(() => {
        if (Auth.isLoggedIn()) { window.location.href = 'index.html'; }
    });

    setupPwToggle('toggle-pw-login', 'login-password', 'eye-login');
    setupPwToggle('toggle-pw-signup', 'signup-password', 'eye-signup');

    $(document).on('keydown', e => {
        if (e.key !== 'Enter') return;
        if (!$('#auth-login').hasClass('hidden')) doLogin();
        else if (!$('#auth-signup').hasClass('hidden')) doSignup();
        else if (!$('#auth-forgot').hasClass('hidden')) doForgot();
    });

    $('#login-submit').on('click', doLogin);
    $('#signup-submit').on('click', doSignup);
    $('#forgot-submit').on('click', doForgot);

    const nav = (linkId, page) => $('#' + linkId).on('click', e => { e.preventDefault(); showAuthPage(page); });
    nav('go-forgot', 'forgot');
    nav('go-signup', 'signup');
    nav('go-login-from-signup', 'login');
    nav('go-login-from-forgot', 'login');
    nav('go-signup-from-forgot', 'signup');
});
