// modules/templates.js
import { appState, uid, escapeHtml, saveState, setCurrentIdeaId, formatISODate, autoResize } from './core.js';
import { showNotification, customConfirm } from './dialogs.js';
import { setActivePage } from './navigation.js';

export function renderTemplates() {
    const container = document.getElementById('templates-list');
    const badge = document.getElementById('templates-badge');
    const templates = appState.templates || [];
    // Скрываем шаблоны локально у текущего пользователя
    const hiddenTemplatesKey = 'glitchless-pin-hidden-templates';
    const hiddenUserIdKey = 'glitchless-pin-user-id';
    let userId = localStorage.getItem(hiddenUserIdKey);
    if (!userId) userId = uid();
    const rawHidden = localStorage.getItem(hiddenTemplatesKey);
    let parsedHidden = {};
    try { parsedHidden = rawHidden ? JSON.parse(rawHidden) : {}; } catch { parsedHidden = {}; }
    const hiddenSet = new Set(Array.isArray(parsedHidden[userId]) ? parsedHidden[userId] : []);
    const visibleTemplates = templates.filter(t => !hiddenSet.has(t.id));
    if (badge) badge.textContent = templates.length;
    if (!container) return;
    if (templates.length === 0) {
        container.innerHTML = `<div class="empty-templates"><div class="empty-icon">⭐</div><p>Нет избранных шаблонов</p><p class="empty-hint">Лайкайте посты сердечком, они сохранятся сюда</p></div>`;
        return;
    }
    const tagIcons = { Pinterest: '📌', Insta: '📸', TG: '✈️', Блог: '📝' };
    const dirIcons = { Экспертность: '🎓', Польза: '💡', Продажа: '💰' };
    container.innerHTML = templates.map(t => `
        <div class="template-card">
            <div class="template-header"><div class="template-badges"><span class="template-tag">${tagIcons[t.tagKey]||'📌'} ${t.tagKey}</span><span class="template-direction">${dirIcons[t.direction]||'🎓'} ${t.direction}</span></div><button class="template-delete" data-id="${t.id}">🗑️</button></div>
            <div class="template-title">${escapeHtml(t.topic)}</div>
            <div class="template-preview">${escapeHtml(t.postText.substring(0,120))}...</div>
            <button class="template-use" data-id="${t.id}">📋 Использовать шаблон</button>
        </div>
    `).join('');
    container.querySelectorAll('.template-delete').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const confirmed = await customConfirm('Удалить из шаблонов?', 'Подтверждение');
            if (confirmed) {
                const hiddenKey = 'glitchless-pin-user-id';
                let userId = localStorage.getItem(hiddenKey);
                if (!userId) {
                    userId = uid();
                    localStorage.setItem(hiddenKey, userId);
                }
                const hiddenTemplatesKey = 'glitchless-pin-hidden-templates';
                const raw = localStorage.getItem(hiddenTemplatesKey);
                let parsed = {};
                try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }
                if (!Array.isArray(parsed[userId])) parsed[userId] = [];
                if (!parsed[userId].includes(id)) parsed[userId].push(id);
                localStorage.setItem(hiddenTemplatesKey, JSON.stringify(parsed));

                appState.templates = appState.templates.filter(t => t.id !== id);
                saveState();
                renderTemplates();
                showNotification('Скрыто у этого пользователя', 'info');
            }
    }));
    container.querySelectorAll('.template-use').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const template = appState.templates.find(t => t.id === id);
        if (template) {
            setCurrentIdeaId(template.ideaId);
            const postOutput = document.getElementById('post-output');
            postOutput.value = template.postText;
            autoResize(postOutput);
            document.getElementById('plan-date').value = formatISODate(new Date());
            document.getElementById('plan-notes').value = '';
            setActivePage('planner');
            showNotification('📋 Шаблон загружен', 'success');
        }
    }));
}

export function addTemplate(ideaId, postText, topic, direction, tagKey) {
    if (!appState.templates) appState.templates = [];
    if (appState.templates.find(t => t.ideaId === ideaId)) { showNotification('⭐ Пост уже в шаблонах', 'info'); return false; }
    appState.templates.push({ id: uid(), ideaId, postText, topic, direction, tagKey, likedAt: new Date().toISOString() });
    saveState();
    renderTemplates();
    showNotification('❤️ Пост сохранён в шаблоны!', 'success');
    return true;
}