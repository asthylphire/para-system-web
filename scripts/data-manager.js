// DATA MANAGER (landmarks). Same job as before, but the data lives in MySQL via api/landmarks/*.php.
// A small in-memory cache keeps the UI fast; the server is the source of truth.
const DataManager = {
    cache: [],

    reset() { this.cache = []; },

    async load() {
        if (!Auth.isLoggedIn()) { this.reset(); return this.cache; }
        const res = await API.get('landmarks/list.php');
        this.cache = res.landmarks;
        return this.cache;
    },

    getLandmarks() { return this.cache; },

    getLandmark(id) {
        return this.cache.find(l => l.id === Number(id)) || null;
    },

    async addLandmark(name, category, description, lat, lng) {
        const res = await API.post('landmarks/add.php', { name, category, description, lat, lng });
        const lm = res.landmark;
        this.cache.unshift(lm);
        return lm;
    },

    async updateLandmark(id, name, category, description) {
        const res = await API.post('landmarks/update.php', { id: Number(id), name, category, description });
        const lm = this.getLandmark(id);
        if (lm) Object.assign(lm, res.landmark);
        return lm;
    },

    async deleteLandmark(id) {
        await API.post('landmarks/delete.php', { id: Number(id) });
        this.cache = this.cache.filter(l => l.id !== Number(id));
        return true;
    }
};
