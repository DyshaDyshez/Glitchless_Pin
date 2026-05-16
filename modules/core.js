// modules/core.js
export const CONFIG = {
    LS_KEY: 'glitchless-pin-v3',
    OPENROUTER_API_KEY: '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',
    OPENROUTER_URL: 'https://openrouter.ai/api/v1/chat/completions',
};

export let appState = { ideas: [], calendar: [], templates: [], version: 3 };
export let currentIdeaId = null;
export let isEditing = false;

export function setCurrentIdeaId(id) { currentIdeaId = id; }
export function setIsEditing(value) { isEditing = value; }
export function setAppState(newState) { Object.assign(appState, newState); }

export function uid() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
export function formatISODate(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
export function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
}

export function loadState() {
    const raw = localStorage.getItem(CONFIG.LS_KEY);
    if (!raw) return { ideas: [], calendar: [], templates: [], version: 3 };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.templates) parsed.templates = [];
        if (!parsed.calendar) parsed.calendar = [];
        return parsed;
    } catch { return { ideas: [], calendar: [], templates: [], version: 3 }; }
}

export function saveState() {
    localStorage.setItem(CONFIG.LS_KEY, JSON.stringify(appState));
    // Обновляем UI после сохранения через глобальные вызовы
    if (window._afterSave) window._afterSave();
}