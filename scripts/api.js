// API HELPER (requires jQuery). Every request to the PHP backend goes through here.
// - Sends/receives JSON
// - Loads the CSRF token from auth/me.php and attaches it to every POST
// - Turns every failure into { status, message, errors } so the UI can show it

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const API = {
    base: '../api/',
    csrf: null,
    _session: null,

    _toError(xhr) {
        if (xhr.status === 0) {
            return { status: 0, errors: {},
                message: 'Cannot reach the server. Check your connection and that Apache/MySQL are running.' };
        }
        let body = xhr.responseJSON;
        if (!body && xhr.responseText) {
            try { body = JSON.parse(xhr.responseText); } catch (e) { /* not JSON */ }
        }
        return {
            status: xhr.status,
            message: (body && body.message) || 'Unexpected server response.',
            errors: (body && body.errors) || {}
        };
    },

    request(method, url, data) {
        return new Promise((resolve, reject) => {
            const opts = { url: this.base + url, method: method, dataType: 'json', headers: {} };
            if (method === 'GET') {
                opts.data = data;
            } else {
                opts.contentType = 'application/json; charset=utf-8';
                opts.data = JSON.stringify(data || {});
                if (this.csrf) opts.headers['X-CSRF-Token'] = this.csrf;
            }
            $.ajax(opts)
                .done(res => resolve(res))
                .fail(xhr => reject(this._toError(xhr)));
        });
    },

    get(url, data) {
        return this.request('GET', url, data);
    },

    async post(url, data) {
        try { await this.session(); } catch (e) { /* the request below reports the problem */ }
        try {
            return await this.request('POST', url, data);
        } catch (err) {
            if (err.status === 403) {          // stale CSRF token: get a fresh one, retry once
                await this.session(true).catch(() => {});
                return this.request('POST', url, data);
            }
            throw err;
        }
    },

    // Loads who is logged in + the CSRF token (cached; pass true to refresh)
    session(force = false) {
        if (force || !this._session) {
            this._session = this.request('GET', 'auth/me.php')
                .then(res => { this.csrf = res.csrf; return res; })
                .catch(err => { this._session = null; throw err; });
        }
        return this._session;
    },

    // One readable message from an error: first field error if there is one
    describe(err) {
        if (err && err.errors) {
            const first = Object.values(err.errors)[0];
            if (first) return first;
        }
        return (err && err.message) || 'Something went wrong.';
    }
};
