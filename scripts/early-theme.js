// Applies dark mode before the page renders (prevents a flash of the light theme).
(function () {
    try {
        if (localStorage.getItem('para_dark') === 'true') {
            document.documentElement.classList.add('dark');
        }
    } catch (e) { /* storage blocked: ignore */ }
})();
