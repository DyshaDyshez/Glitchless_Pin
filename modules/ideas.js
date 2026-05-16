// modules/ideas.js
import { appState, currentIdeaId, setCurrentIdeaId, uid, formatISODate, escapeHtml, autoResize, saveState } from './core.js';
import { showNotification, customConfirm } from './dialogs.js';
import { generatePostForIdea } from './ai.js';
import { addTemplate } from './templates.js'; // будет импортировано позже

export function addIdea({ topic, tagKey, text, direction }) {
    const newIdea = { id: uid(), topic: topic.trim(), tagKey, details: text.trim(), direction, createdAt: Date.now(), postText: '', calendarDate: '', notes: '' };
    appState.ideas.unshift(newIdea);
    saveState();
    return newIdea;
}

export async function deleteIdea(id) {
    const confirmed = await customConfirm('🗑️ Удалить эту идею? Это действие нельзя отменить.', 'Удаление идеи');
    if (!confirmed) return;
    appState.ideas = appState.ideas.filter(i => i.id !== id);
    appState.calendar = appState.calendar.filter(c => c.ideaId !== id);
    saveState();
    if (currentIdeaId === id) {
        setCurrentIdeaId(null);
        document.getElementById('post-output').value = '';
        document.getElementById('post-output').placeholder = '✨ Здесь появится готовый пост после генерации...';
    }
    showNotification('✅ Идея удалена', 'info');
}

export function renderIdeas() {
    const ideas = [...(appState.ideas || [])].sort((a, b) => b.createdAt - a.createdAt);
    const container = document.getElementById('ideas-list');
    const countSpan = document.getElementById('ideas-count');
    if (!container) return;
    if (countSpan) countSpan.textContent = ideas.length;
    if (ideas.length === 0) {
        container.innerHTML = `<div class="empty-ideas"><div class="empty-icon">💡</div><p>Нет сохранённых идей</p><p class="empty-hint">Создайте первую идею или используйте "Авто-идеи"</p></div>`;
        return;
    }
    const tagIcons = { Pinterest: '📌', Insta: '📸', TG: '✈️', Блог: '📝' };
    const dirIcons = { Экспертность: '🎓', Польза: '💡', Продажа: '💰' };
    container.innerHTML = ideas.map(idea => {
        const hasPost = !!idea.postText;
        return `
            <div class="idea-card" data-idea-id="${idea.id}">
                <div class="idea-card-header"><div class="idea-badges"><span class="idea-tag">${tagIcons[idea.tagKey] || '📌'} ${idea.tagKey}</span><span class="idea-direction">${dirIcons[idea.direction] || '🎓'} ${idea.direction}</span></div></div>
                <div class="idea-title">${escapeHtml(idea.topic)}</div>
                ${idea.details ? `<div class="idea-details">${escapeHtml(idea.details.substring(0,80))}${idea.details.length>80?'...':''}</div>` : ''}
                <div class="idea-actions">
                    ${!hasPost ? `<button class="idea-btn idea-btn-generate" data-generate-id="${idea.id}">🚀 Сгенерировать</button>` : `<button class="idea-btn idea-btn-view" data-view-id="${idea.id}">👁️ Смотреть пост</button>`}
                    <button class="idea-btn idea-btn-delete" data-delete-id="${idea.id}">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    container.querySelectorAll('.idea-btn-generate').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); generatePostForIdea(btn.getAttribute('data-generate-id'), true); }));
    container.querySelectorAll('.idea-btn-view').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-view-id');
        const idea = appState.ideas.find(i => i.id === id);
        if (idea && idea.postText) {
            setCurrentIdeaId(id);
            const postOutput = document.getElementById('post-output');
            postOutput.value = idea.postText;
            autoResize(postOutput);
            document.getElementById('plan-date').value = idea.calendarDate || formatISODate(new Date());
            document.getElementById('plan-notes').value = idea.notes || '';
            const likeBtn = document.getElementById('btn-like-post');
            const isLiked = appState.templates?.some(t => t.ideaId === id);
            likeBtn.innerHTML = isLiked ? '<i class="fa-solid fa-heart"></i> В шаблонах ✅' : '<i class="fa-regular fa-heart"></i> Сохранить в шаблоны';
            likeBtn.disabled = isLiked;
            if (isLiked) likeBtn.classList.add('opacity-50'); else likeBtn.classList.remove('opacity-50');
            showNotification('📄 Пост загружен в редактор', 'success');
        }
    }));
    container.querySelectorAll('.idea-btn-delete').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteIdea(btn.getAttribute('data-delete-id')); }));
}