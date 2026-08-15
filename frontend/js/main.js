import { renderHeader, initHeader } from './components/header.js';
import { initRouter } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
    renderHeader(document.getElementById('header-root'));
    initHeader();
    initRouter();
});
