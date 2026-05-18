// ============ КОНФИГУРАЦИЯ ============
const CONFIG = {
    LS_KEY: 'glitchless-pin-v3',
};

window.closeModal = closeModal;

// ============ ГЛОБАЛЬНОЕ СОСТОЯНИЕ ============
let appState = { ideas: [], calendar: [], templates: [], version: 3 };
let currentIdeaId = null;
let isEditing = false;

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============
function uid() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
function formatISODate(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
}

// ============ КАСТОМНЫЕ УВЕДОМЛЕНИЯ ============
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    notification.style.cssText = `
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease forwards;
        z-index: 1000;
    `;
    notification.innerHTML = `${icons[type]} ${message}`;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ МОДАЛЬНЫЕ ДИАЛОГИ ============
function openModal(html, isDialog = false) {
    const modalRoot = document.getElementById('modal-root');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = html;
    modalRoot.classList.remove('hidden');
    if (isDialog) modalContent.classList.add('dialog-modal');
    setTimeout(() => modalBackdrop.classList.add('show'), 10);
    
    // Закрытие по клику на backdrop
    modalBackdrop.onclick = (e) => {
        if (e.target === modalBackdrop) closeModal();
    };
    
    const firstInput = modalContent.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    
}

function closeModal() {
    const modalRoot = document.getElementById('modal-root');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    modalBackdrop.classList.remove('show');
    setTimeout(() => {
        modalRoot.classList.add('hidden');
        modalContent.innerHTML = '';
        modalContent.classList.remove('dialog-modal');
    }, 200);
}
function customConfirm(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
        const html = `
            <div class="custom-dialog custom-confirm">
                <div class="dialog-icon">❓</div>
                <div class="dialog-title">${escapeHtml(title)}</div>
                <div class="dialog-message">${escapeHtml(message)}</div>
                <div class="dialog-actions">
                    <button class="dialog-btn dialog-btn-secondary" data-confirm-no>Отмена</button>
                    <button class="dialog-btn dialog-btn-primary" data-confirm-yes>Подтвердить</button>
                </div>
            </div>
        `;
        
        // Открываем модалку
        const modalRoot = document.getElementById('modal-root');
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = html;
        modalRoot.classList.remove('hidden');
        setTimeout(() => modalBackdrop.classList.add('show'), 10);
        
        // Обработчики кнопок
        const yesBtn = modalContent.querySelector('[data-confirm-yes]');
        const noBtn = modalContent.querySelector('[data-confirm-no]');
        
        const cleanup = () => {
            modalBackdrop.classList.remove('show');
            setTimeout(() => {
                modalRoot.classList.add('hidden');
                modalContent.innerHTML = '';
            }, 200);
        };
        
        yesBtn.onclick = () => {
            cleanup();
            resolve(true);
        };
        
        noBtn.onclick = () => {
            cleanup();
            resolve(false);
        };
        
        // Закрытие по клику на фон
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) {
                cleanup();
                resolve(false);
            }
        };
    });
}
function customPrompt(message, defaultValue = '', title = 'Введите значение') {
    return new Promise((resolve) => {
        const html = `
            <div class="custom-dialog custom-prompt">
                <div class="dialog-icon">✏️</div>
                <div class="dialog-title">${escapeHtml(title)}</div>
                <div class="dialog-message">${escapeHtml(message)}</div>
                <div class="dialog-input-wrapper">
                    <input type="text" id="prompt-input" class="dialog-input" value="${escapeHtml(defaultValue)}" placeholder="Введите текст..." autofocus />
                </div>
                <div class="dialog-actions">
                    <button class="dialog-btn dialog-btn-secondary" data-prompt-cancel>Отмена</button>
                    <button class="dialog-btn dialog-btn-primary" data-prompt-ok>OK</button>
                </div>
            </div>
        `;
        
        const modalRoot = document.getElementById('modal-root');
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = html;
        modalRoot.classList.remove('hidden');
        setTimeout(() => modalBackdrop.classList.add('show'), 10);
        
        const input = modalContent.querySelector('#prompt-input');
        const okBtn = modalContent.querySelector('[data-prompt-ok]');
        const cancelBtn = modalContent.querySelector('[data-prompt-cancel]');
        
        const cleanup = () => {
            modalBackdrop.classList.remove('show');
            setTimeout(() => {
                modalRoot.classList.add('hidden');
                modalContent.innerHTML = '';
            }, 200);
        };
        
        okBtn.onclick = () => {
            const value = input?.value || '';
            cleanup();
            resolve(value);
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };
        
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) {
                cleanup();
                resolve(null);
            }
        };
        
        setTimeout(() => input?.focus(), 100);
    });
}
window._dialogResolve = null;
window.closeModal = closeModal;

// ============ СОХРАНЕНИЕ/ЗАГРУЗКА ============
function loadState() {
    const raw = localStorage.getItem(CONFIG.LS_KEY);
    if (!raw) return { ideas: [], calendar: [], templates: [], version: 3 };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.templates) parsed.templates = [];
        if (!parsed.calendar) parsed.calendar = [];
        return parsed;
    } catch { return { ideas: [], calendar: [], templates: [], version: 3 }; }
}
function saveState() {
    localStorage.setItem(CONFIG.LS_KEY, JSON.stringify({
        ideas: appState.ideas,
        calendar: appState.calendar,
        templates: appState.templates,
        version: 3
    }));
    updateStats();
    renderIdeas();
    renderCalendar();
    renderTemplates();
}

// ============ FIREBASE ФУНКЦИИ ДЛЯ ШАБЛОНОВ ============
async function loadTemplatesFromFirebase() {
    if (!window.db) {
        console.warn('Firebase не инициализирован');
        return;
    }
    try {
        const q = window.firebaseQuery(collection(window.db, 'templates'));
        const querySnapshot = await window.firebaseGetDocs(q);
        const templates = [];
        querySnapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() });
        });
        appState.templates = templates;
        renderTemplates();
        updateStats();
        console.log(`✅ Загружено ${templates.length} шаблонов из Firebase`);
    } catch (error) {
        console.error('Ошибка загрузки шаблонов из Firebase:', error);
    }
}

async function saveTemplateToFirebase(template) {
    if (!window.db) return false;
    try {
        await window.firebaseSetDoc(doc(window.db, 'templates', template.id), {
            ideaId: template.ideaId,
            postText: template.postText,
            topic: template.topic,
            direction: template.direction,
            tagKey: template.tagKey,
            likedAt: template.likedAt
        });
        console.log(`✅ Шаблон ${template.id} сохранён в Firebase`);
        return true;
    } catch (error) {
        console.error('Ошибка сохранения шаблона в Firebase:', error);
        return false;
    }
}

async function deleteTemplateFromFirebase(templateId) {
    if (!window.db) return false;
    try {
        await window.firebaseDeleteDoc(doc(window.db, 'templates', templateId));
        console.log(`✅ Шаблон ${templateId} удалён из Firebase`);
        return true;
    } catch (error) {
        console.error('Ошибка удаления шаблона из Firebase:', error);
        return false;
    }
}

// ============ AI ГЕНЕРАЦИЯ ============
async function generateAIPost(topic, direction, platform, details = '') {
    const systemPrompt = `Ты профессиональный копирайтер. Напиши ГОТОВЫЙ ПОСТ для публикации.
Тема: "${topic}"
Платформа: ${platform}
Направление: ${direction}
${details ? `Дополнительно: ${details}` : ''}
Требования:
1. Начни с цепляющего заголовка
2. Используй эмодзи для вовлечения
3. Разбей на короткие абзацы
4. Добавь призыв к действию
5. В конце добавь 3-5 хэштегов`;

    // Берём API ключ из глобальной переменной (загруженной из Firestore)
    const API_KEY = window.OPENROUTER_API_KEY;
    
    if (!API_KEY) {
        throw new Error('API ключ не загружен. Проверь Firestore (коллекция config, документ api)');
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Glitchless Pin'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-lite-001',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Напиши пост на тему: "${topic}"` }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        let post = data.choices[0].message.content;
        post = post.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
        return post;
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error(`Ошибка генерации: ${error.message}`);
    }
}

async function generatePostForIdea(ideaId, showInEditor = true) {
    const idea = appState.ideas.find(i => i.id === ideaId);
    if (!idea) {
        showNotification('❌ Идея не найдена', 'error');
        return;
    }
    const btn = document.querySelector(`[data-generate-id="${ideaId}"]`);
    const originalHTML = btn?.innerHTML;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Генерация...';
    }
    try {
        const platform = { Pinterest: 'Pinterest', Insta: 'Instagram', TG: 'Telegram', Блог: 'Блог' }[idea.tagKey] || idea.tagKey;
        const post = await generateAIPost(idea.topic, idea.direction, platform, idea.details);
        idea.postText = post;
        saveState();
        if (showInEditor) {
            currentIdeaId = ideaId;
            const postOutput = document.getElementById('post-output');
            postOutput.value = post;
            autoResize(postOutput);
            document.getElementById('plan-date').value = idea.calendarDate || formatISODate(new Date());
            document.getElementById('plan-notes').value = idea.notes || '';
            const likeBtn = document.getElementById('btn-like-post');
            const isLiked = appState.templates?.some(t => t.ideaId === ideaId);
            likeBtn.innerHTML = isLiked ? '<i class="fa-solid fa-heart"></i> В шаблонах ✅' : '<i class="fa-regular fa-heart"></i> Сохранить в шаблоны';
            likeBtn.disabled = isLiked;
            if (isLiked) likeBtn.classList.add('opacity-50');
            else likeBtn.classList.remove('opacity-50');
        }
        if (btn) {
            btn.innerHTML = '✅ Готово!';
            setTimeout(() => { if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; } }, 1500);
        }
        showNotification('✨ Пост сгенерирован!', 'success');
    } catch (error) {
        console.error(error);
        if (btn) {
            btn.innerHTML = '❌ Ошибка';
            setTimeout(() => { if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; } }, 3000);
        }
        showNotification(error.message, 'error');
    }
}

// ============ CRUD ИДЕИ ============
function addIdea({ topic, tagKey, text, direction }) {
    const newIdea = { id: uid(), topic: topic.trim(), tagKey, details: text.trim(), direction, createdAt: Date.now(), postText: '', calendarDate: '', notes: '' };
    appState.ideas.unshift(newIdea);
    saveState();
    return newIdea;
}
async function deleteIdea(id) {
    const confirmed = await customConfirm('🗑️ Удалить эту идею? Это действие нельзя отменить.', 'Удаление идеи');
    if (!confirmed) return;
    appState.ideas = appState.ideas.filter(i => i.id !== id);
    appState.calendar = appState.calendar.filter(c => c.ideaId !== id);
    saveState();
    if (currentIdeaId === id) { currentIdeaId = null; document.getElementById('post-output').value = ''; document.getElementById('post-output').placeholder = '✨ Здесь появится готовый пост после генерации...'; }
    showNotification('✅ Идея удалена', 'info');
}

// ============ РЕНДЕР СПИСКА ИДЕЙ ============
function renderIdeas() {
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
            currentIdeaId = id;
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

// ============ ШАБЛОНЫ (С FIREBASE) ============
function renderTemplates() {
    const container = document.getElementById('templates-list');
    const badge = document.getElementById('templates-badge');
    const templates = appState.templates || [];
    if (badge) badge.textContent = templates.length;
    if (!container) return;
    if (templates.length === 0) {
        container.innerHTML = `<div class="empty-templates"><div class="empty-icon">⭐</div><p>Нет избранных шаблонов</p><p class="empty-hint">Лайкайте посты сердечком, они сохранятся в облако</p></div>`;
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
            await deleteTemplateFromFirebase(id);
            appState.templates = appState.templates.filter(t => t.id !== id);
            saveState();
            renderTemplates();
            updateStats();
            showNotification('Удалено из шаблонов', 'info');
        }
    }));
    container.querySelectorAll('.template-use').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const template = appState.templates.find(t => t.id === id);
        if (template) {
            currentIdeaId = template.ideaId;
            document.getElementById('post-output').value = template.postText;
            autoResize(document.getElementById('post-output'));
            document.getElementById('plan-date').value = formatISODate(new Date());
            document.getElementById('plan-notes').value = '';
            setActivePage('planner');
            showNotification('📋 Шаблон загружен', 'success');
        }
    }));
}

async function addTemplate(ideaId, postText, topic, direction, tagKey) {
    if (!appState.templates) appState.templates = [];
    if (appState.templates.find(t => t.ideaId === ideaId)) { showNotification('⭐ Пост уже в шаблонах', 'info'); return false; }
    const newTemplate = { id: uid(), ideaId, postText, topic, direction, tagKey, likedAt: new Date().toISOString() };
    const saved = await saveTemplateToFirebase(newTemplate);
    if (saved) {
        appState.templates.push(newTemplate);
        saveState();
        renderTemplates();
        updateStats();
        showNotification('❤️ Пост сохранён в облачные шаблоны!', 'success');
        return true;
    } else {
        showNotification('❌ Ошибка сохранения в облако', 'error');
        return false;
    }
}

// ============ КАЛЕНДАРЬ ==========
let calCursor = new Date();
let dragSource = null;

function renderCalendar() {
    const container = document.getElementById('calendar-grid');
    if (!container) return;
    const year = calCursor.getFullYear(), month = calCursor.getMonth();
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month+1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const calendarItems = {};
    (appState.calendar || []).forEach(item => { if (item.date) { if (!calendarItems[item.date]) calendarItems[item.date] = []; calendarItems[item.date].push(item); } });
    const weekdays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const todayStr = formatISODate(new Date());
    const DIR_COLORS = { Экспертность: '#3b82f6', Польза: '#22c55e', Продажа: '#ef4444' };
    const DIR_ICONS = { Экспертность: '🎓', Польза: '💡', Продажа: '💰' };
    let html = `<div class="calendar-header"><button class="calendar-nav-btn" id="cal-prev-month">◀</button><div class="calendar-month-title">${calCursor.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</div><button class="calendar-nav-btn" id="cal-next-month">▶</button><button class="calendar-today-btn" id="cal-today">📅 Сегодня</button></div><div class="calendar-weekdays">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}</div><div class="calendar-days">`;
    for (let i = 0; i < startOffset; i++) html += `<div class="calendar-day empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const items = calendarItems[dateStr] || [];
        const isToday = dateStr === todayStr;
        html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}"><div class="calendar-day-number">${day}</div><div class="calendar-items">`;
        items.slice(0,3).forEach(item => {
            const idea = appState.ideas?.find(i => i.id === item.ideaId);
            const isPublished = item.published || false;
            html += `<div class="calendar-item ${isPublished ? 'published' : ''}" data-item-id="${item.id}" data-date="${dateStr}" draggable="true" style="border-left-color: ${DIR_COLORS[item.direction] || '#64748b'}"><span class="item-icon">${DIR_ICONS[item.direction] || '📝'}</span><span class="item-title">${escapeHtml(idea?.topic?.substring(0,20) || item.direction)}</span>${isPublished ? '<span class="published-badge">✓</span>' : ''}</div>`;
        });
        if (items.length === 0) html += `<div class="calendar-item empty-slot"></div>`;
        if (items.length > 3) html += `<div class="calendar-more">+${items.length-3} еще</div>`;
        html += `</div></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    attachCalendarEvents();
}

function attachCalendarEvents() {
    const items = document.querySelectorAll('.calendar-item');
    const days = document.querySelectorAll('.calendar-day');
    items.forEach(item => {
        if (item.classList.contains('empty-slot')) return;
        item.setAttribute('draggable','true');
        item.addEventListener('dragstart', (e) => { dragSource = { id: item.getAttribute('data-item-id'), fromDate: item.getAttribute('data-date') }; e.dataTransfer.setData('text/plain', JSON.stringify(dragSource)); item.style.opacity='0.5'; });
        item.addEventListener('dragend', () => { item.style.opacity=''; dragSource=null; });
        item.addEventListener('click', (e) => { e.stopPropagation(); const id = item.getAttribute('data-item-id'); const calItem = appState.calendar?.find(c => c.id === id); if (calItem) openPostModal(calItem); });
    });
    days.forEach(day => {
        day.addEventListener('dragover', (e) => { e.preventDefault(); day.classList.add('drag-over'); });
        day.addEventListener('dragleave', () => { day.classList.remove('drag-over'); });
        day.addEventListener('drop', (e) => { e.preventDefault(); day.classList.remove('drag-over'); const toDate = day.getAttribute('data-date'); if (dragSource && toDate !== dragSource.fromDate) { const calItem = appState.calendar?.find(c => c.id === dragSource.id); if (calItem) { calItem.date = toDate; const idea = appState.ideas?.find(i => i.id === calItem.ideaId); if (idea) idea.calendarDate = toDate; saveState(); renderCalendar(); showNotification('📅 Дата изменена', 'success'); } } });
    });
}

function openPostModal(calendarItem) {
    const idea = appState.ideas?.find(i => i.id === calendarItem.ideaId);
    if (!idea) return;
    const isPublished = calendarItem.published || false;
    const DIR_ICONS = { Экспертность: '🎓', Польза: '💡', Продажа: '💰' };
    const TAG_ICONS = { Pinterest: '📌', Insta: '📸', TG: '✈️', Блог: '📝' };
    
    const html = `
        <div class="post-modal">
            <div class="modal-header">
                <div class="modal-title">
                    <span class="modal-icon">${DIR_ICONS[calendarItem.direction] || '📝'}</span> 
                    ${escapeHtml(idea.topic || 'Без темы')}
                </div>
                <button class="modal-close" data-close-modal>✕</button>
            </div>
            <div class="modal-meta">
                <div class="meta-item"><span class="meta-label">📅 Дата:</span><span class="meta-value">${calendarItem.date}</span></div>
                <div class="meta-item"><span class="meta-label">📱 Платформа:</span><span class="meta-value">${TAG_ICONS[calendarItem.tagKey] || '📌'} ${calendarItem.tagKey}</span></div>
                <div class="meta-item"><span class="meta-label">🎯 Направление:</span><span class="meta-value" style="color:${calendarItem.direction === 'Экспертность' ? '#3b82f6' : calendarItem.direction === 'Польза' ? '#22c55e' : '#ef4444'}">${DIR_ICONS[calendarItem.direction]} ${calendarItem.direction}</span></div>
                <div class="meta-item"><span class="meta-label">📌 Статус:</span><span class="status-badge ${isPublished ? 'published' : 'draft'}">${isPublished ? '✅ Опубликован' : '📝 Черновик'}</span></div>
            </div>
            <div class="modal-divider"></div>
            <div class="modal-section">
                <div class="section-title">📝 Текст поста</div>
                <div class="post-content" id="modal-post-content" style="white-space: pre-wrap;">${escapeHtml(idea.postText || 'Текст не сгенерирован')}</div>
                <textarea id="modal-post-textarea" style="display:none; width:100%; min-height:200px; padding:12px; border-radius:12px; border:2px solid #6366f1; font-family:inherit; font-size:14px;">${escapeHtml(idea.postText || '')}</textarea>
            </div>
            ${calendarItem.notes ? `<div class="modal-section"><div class="section-title">📌 Заметки</div><div class="notes-content">${escapeHtml(calendarItem.notes)}</div></div>` : ''}
            <div class="modal-divider"></div>
            <div class="modal-actions">
                <button class="btn btn--secondary" id="modal-copy-btn">📋 Копировать текст</button>
                <button class="btn btn--secondary" id="modal-edit-toggle-btn">✏️ Редактировать</button>
                ${!isPublished ? `<button class="btn btn--success" id="modal-publish-btn">✅ Отметить как опубликованный</button>` : `<button class="btn btn--warning" id="modal-draft-btn">📝 Вернуть в черновики</button>`}
                <button class="btn btn--ghost" id="modal-close-btn">Закрыть</button>
            </div>
        </div>
    `;
    openModal(html);
    
    setTimeout(() => {
        const contentDiv = document.getElementById('modal-post-content');
        const textarea = document.getElementById('modal-post-textarea');
        const editBtn = document.getElementById('modal-edit-toggle-btn');
        const copyBtn = document.getElementById('modal-copy-btn');
        const closeBtn = document.getElementById('modal-close-btn');
        const publishBtn = document.getElementById('modal-publish-btn');
        const draftBtn = document.getElementById('modal-draft-btn');
        
        let isEditMode = false;
        
        // Закрытие модалки
        if (closeBtn) {
            closeBtn.onclick = () => closeModal();
        }
        
        // Обработчик публикации
        if (publishBtn) {
            publishBtn.onclick = () => {
                markAsPublished(calendarItem.id);
            };
        }
        
        // Обработчик черновика
        if (draftBtn) {
            draftBtn.onclick = () => {
                markAsDraft(calendarItem.id);
            };
        }
        
        if (editBtn) {
            editBtn.onclick = () => {
                if (!isEditMode) {
                    contentDiv.style.display = 'none';
                    textarea.style.display = 'block';
                    editBtn.innerHTML = '💾 Сохранить';
                    editBtn.classList.add('btn--primary');
                    isEditMode = true;
                } else {
                    const newText = textarea.value;
                    const ideaToUpdate = appState.ideas.find(i => i.id === calendarItem.ideaId);
                    if (ideaToUpdate) {
                        ideaToUpdate.postText = newText;
                        saveState();
                        showNotification('✅ Пост обновлён!', 'success');
                        contentDiv.textContent = newText;
                        contentDiv.style.whiteSpace = 'pre-wrap';
                    }
                    contentDiv.style.display = 'block';
                    textarea.style.display = 'none';
                    editBtn.innerHTML = '✏️ Редактировать';
                    editBtn.classList.remove('btn--primary');
                    isEditMode = false;
                }
            };
        }
        
        if (copyBtn) {
            copyBtn.onclick = () => {
                const textToCopy = isEditMode ? textarea.value : contentDiv.innerText;
                navigator.clipboard.writeText(textToCopy).then(() => showNotification('📋 Текст скопирован!', 'success'));
            };
        }
    }, 50);
}

function markAsPublished(id) {
    const item = appState.calendar?.find(c => c.id === id);
    if (item) { item.published = true; item.publishedAt = new Date().toISOString(); saveState(); renderCalendar(); closeModal(); showNotification('✅ Пост отмечен как опубликованный!', 'success'); }
}
function markAsDraft(id) {
    const item = appState.calendar?.find(c => c.id === id);
    if (item) { item.published = false; delete item.publishedAt; saveState(); renderCalendar(); closeModal(); showNotification('📝 Пост возвращён в черновики', 'info'); }
}
function addToCalendar() {
    if (!currentIdeaId) { showNotification('❌ Сначала сгенерируйте пост', 'warning'); return; }
    const idea = appState.ideas.find(i => i.id === currentIdeaId);
    if (!idea || !idea.postText) { showNotification('❌ Сначала сгенерируйте пост', 'warning'); return; }
    const date = document.getElementById('plan-date')?.value || formatISODate(new Date());
    const notes = document.getElementById('plan-notes')?.value || '';
    const existing = appState.calendar?.find(c => c.ideaId === currentIdeaId);
    if (existing) {
        customConfirm('📅 Этот пост уже в календаре. Обновить дату?', 'Подтверждение').then(confirmed => {
            if (confirmed) { existing.date = date; existing.notes = notes; idea.calendarDate = date; idea.notes = notes; saveState(); renderCalendar(); showNotification('📅 Дата обновлена!', 'success'); }
        });
        return;
    }
    appState.calendar.push({ id: uid(), date, ideaId: currentIdeaId, direction: idea.direction, tagKey: idea.tagKey, notes, published: false, createdAt: new Date().toISOString() });
    idea.calendarDate = date; idea.notes = notes;
    saveState(); renderCalendar(); showNotification('✅ Пост добавлен в календарь!', 'success'); setActivePage('calendar');
}

// ============ СТАТИСТИКА ============
function updateStats() {
    const ideasCount = appState.ideas?.length || 0;
    const postsCount = appState.ideas?.filter(i => i.postText).length || 0;
    const templatesCount = appState.templates?.length || 0;
    const daysCount = new Set(appState.calendar?.map(c => c.date) || []).size;
    const statIdeas = document.getElementById('stat-ideas'), statPosts = document.getElementById('stat-posts'), statTemplates = document.getElementById('stat-templates'), statDays = document.getElementById('stat-days');
    if (statIdeas) statIdeas.textContent = ideasCount;
    if (statPosts) statPosts.textContent = postsCount;
    if (statTemplates) statTemplates.textContent = templatesCount;
    if (statDays) statDays.textContent = daysCount;
    const tagStats = {};
    const tagColors = { Pinterest: '#ef4444', Insta: '#22c55e', TG: '#3b82f6', Блог: '#f59e0b' };
    const tagIcons = { Pinterest: '📌', Insta: '📸', TG: '✈️', Блог: '📝' };
    appState.ideas?.forEach(idea => { tagStats[idea.tagKey] = (tagStats[idea.tagKey] || 0) + 1; });
    const tagsContainer = document.getElementById('stats-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = Object.entries(tagStats).map(([key, count]) => `<div class="stat-tag-item"><div class="stat-tag-dot" style="background:${tagColors[key]||'#64748b'}"></div><span>${tagIcons[key]||'📌'} ${key}</span><span class="stat-tag-count">${count}</span></div>`).join('');
    }
}

// ============ НАВИГАЦИЯ ============
function setActivePage(page) {
    ['planner','templates','calendar','statistics','account'].forEach(p => { const el = document.getElementById(`page-${p}`); if (el) el.classList.toggle('hidden', p !== page); });
    const titles = { planner: { title: '🤖 AI Генератор постов', subtitle: 'Создайте идею → Получите готовый пост → Сохраняйте лучшие' }, templates: { title: '⭐ Избранные шаблоны', subtitle: 'Ваши посты сохраняются в облако' }, calendar: { title: '📅 Контент-календарь', subtitle: 'Планируйте публикации и отмечайте выполненные' }, statistics: { title: '📊 Статистика', subtitle: 'Анализируйте ваш контент' }, account: { title: '👤 Аккаунт', subtitle: 'Настройки и информация' } };
    const title = titles[page];
    if (title) { document.getElementById('page-title').textContent = title.title; document.getElementById('page-subtitle').textContent = title.subtitle; }
    history.replaceState({}, '', '#' + page);
    if (page === 'calendar') renderCalendar();
    if (page === 'templates') renderTemplates();
}

// ============ ОБРАБОТЧИКИ ============
async function saveCurrentIdea() {
    const topic = document.getElementById('idea-topic')?.value.trim();
    if (!topic) { showNotification('❌ Введите тему поста', 'warning'); return; }
    addIdea({ topic, tagKey: document.getElementById('idea-tag')?.value, text: document.getElementById('idea-text')?.value.trim() || '', direction: document.getElementById('direction-select')?.value });
    document.getElementById('idea-topic').value = ''; document.getElementById('idea-text').value = '';
    showNotification('💾 Идея сохранена!', 'success');
}
function copyPost() {
    const postText = document.getElementById('post-output')?.value;
    if (!postText || postText === document.getElementById('post-output')?.placeholder) { showNotification('❌ Нет текста для копирования', 'warning'); return; }
    navigator.clipboard.writeText(postText).then(() => showNotification('📋 Пост скопирован!', 'success')).catch(() => showNotification('❌ Не удалось скопировать', 'error'));
}
function editPost() {
    const textarea = document.getElementById('post-output');
    if (textarea.readOnly) {
        textarea.readOnly = false; textarea.style.background = '#fefce8';
        document.getElementById('btn-edit-post').innerHTML = '✏️ Редактировать (активно)'; textarea.focus(); isEditing = true;
        showNotification('✏️ Режим редактирования включён', 'info');
    } else {
        textarea.readOnly = true; textarea.style.background = '';
        document.getElementById('btn-edit-post').innerHTML = '✏️ Редактировать';
        if (currentIdeaId) { const idea = appState.ideas.find(i => i.id === currentIdeaId); if (idea) { idea.postText = textarea.value; saveState(); showNotification('💾 Изменения сохранены', 'success'); } }
        isEditing = false;
    }
}
function likeCurrentPost() {
    if (!currentIdeaId) { showNotification('❌ Нет активного поста', 'warning'); return; }
    const idea = appState.ideas.find(i => i.id === currentIdeaId);
    if (!idea || !idea.postText) { showNotification('❌ Сначала сгенерируйте пост', 'warning'); return; }
    addTemplate(currentIdeaId, idea.postText, idea.topic, idea.direction, idea.tagKey);
    const likeBtn = document.getElementById('btn-like-post'); likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> В шаблонах ✅'; likeBtn.disabled = true; likeBtn.classList.add('opacity-50');
}
async function regeneratePost() {
    if (!currentIdeaId) { showNotification('❌ Нет активного поста', 'warning'); return; }
    const confirmed = await customConfirm('🔄 Перегенерировать пост? Текущий текст будет заменён.', 'Перегенерация');
    if (confirmed) {
        const postOutput = document.getElementById('post-output');
        postOutput.value = '⏳ Генерация нового текста...';
        autoResize(postOutput);
        await generatePostForIdea(currentIdeaId, true);
    }
}
async function addEmptyIdea() {
    const topic = await customPrompt('📝 Введите тему поста:', '', 'Новая идея');
    if (!topic) return;
    addIdea({ topic, tagKey: document.getElementById('idea-tag')?.value || 'Pinterest', text: '', direction: document.getElementById('direction-select')?.value || 'Экспертность' });
    showNotification('✨ Новая идея создана', 'success');
}
function openAutoGenerateModal() {
    const html = `<div class="custom-modal auto-generate-modal"><div class="modal-header"><div class="modal-title">🎲 Авто-генерация идей</div><button class="modal-close-btn" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">🎯 Тема / Ниша</label><input type="text" id="auto-topic" class="form-input" placeholder="Например: маркетинг, здоровье, бизнес..." /></div><div class="form-group"><label class="form-label">📊 Направление</label><select id="auto-direction" class="form-select"><option value="Экспертность">🎓 Экспертность</option><option value="Польза">💡 Польза</option><option value="Продажа">💰 Продажа</option></select></div><div class="form-group"><label class="form-label">🔢 Количество идей</label><select id="auto-count" class="form-select"><option value="3">3 идеи</option><option value="5">5 идей</option><option value="10">10 идей</option></select></div></div><div class="modal-footer"><button class="btn btn--ghost" onclick="closeModal()">Отмена</button><button class="btn btn--primary" onclick="generateAutoIdeas()">🚀 Сгенерировать</button></div></div>`;
    openModal(html);
}
function generateAutoIdeas() {
    const topic = document.getElementById('auto-topic')?.value.trim() || 'контент-маркетинг';
    const direction = document.getElementById('auto-direction')?.value;
    const count = parseInt(document.getElementById('auto-count')?.value || '3');
    const topicsList = [`${topic}: 10 ошибок, которые убивают результат`,`Как увеличить вовлечённость в ${topic} за 5 шагов`,`Секреты успешного ${topic} от экспертов`,`Топ-5 инструментов для ${topic} в 2024`,`Кейс: как я вывел ${topic} на новый уровень`,`Почему 90% людей терпят неудачу в ${topic}`,`Пошаговый план для начинающих в ${topic}`,`${topic} для чайников: с чего начать?`,`Как монетизировать ${topic} и заработать первые деньги`];
    for (let i = 0; i < Math.min(count, topicsList.length); i++) {
        addIdea({ topic: topicsList[i], tagKey: ['Pinterest','Insta','TG','Блог'][Math.floor(Math.random()*4)], text: `Авто-генерация по теме "${topic}"`, direction });
    }
    closeModal(); showNotification(`✨ Добавлено ${count} идей на тему "${topic}"`, 'success');
}
function exportToExcel() {
    const data = (appState.calendar || []).map(item => { const idea = appState.ideas.find(i => i.id === item.ideaId); return { 'Дата': item.date, 'Платформа': item.tagKey, 'Направление': item.direction, 'Тема': idea?.topic || '', 'Текст поста': idea?.postText || '', 'Заметки': item.notes || '', 'Статус': item.published ? 'Опубликован' : 'Черновик' }; });
    if (data.length === 0) { showNotification('❌ Нет данных для экспорта', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Посты'); XLSX.writeFile(wb, `glitchless-pin-${formatISODate(new Date())}.xlsx`);
    showNotification('📊 Экспорт завершен!', 'success');
}
function exportToJSON() {
    const exportData = { ideas: appState.ideas, calendar: appState.calendar, templates: appState.templates, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `glitchless-pin-${formatISODate(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
    showNotification('💾 JSON экспортирован!', 'success');
}
async function clearAllData() {
    const confirmed = await customConfirm('⚠️ УДАЛЕНИЕ ВСЕХ ДАННЫХ\n\nЭто действие удалит все ваши идеи, посты, шаблоны и календарь. Данные нельзя будет восстановить.\n\nВы уверены?', 'Подтверждение удаления');
    if (confirmed) {
        for (const template of appState.templates) {
            await deleteTemplateFromFirebase(template.id);
        }
        localStorage.removeItem(CONFIG.LS_KEY);
        appState = { ideas: [], calendar: [], templates: [], version: 3 };
        currentIdeaId = null;
        renderIdeas(); renderCalendar(); renderTemplates(); updateStats();
        document.getElementById('post-output').value = ''; document.getElementById('post-output').placeholder = '✨ Здесь появится готовый пост после генерации...';
        showNotification('🗑️ Все данные удалены', 'info');
    }
}
function openHashtagsModal() {
    const categories = {
        '🔥 Популярные': ['#socialmedia','#contentcreator','#viral','#trending','#explore','#fyp','#рекомендации'],
        '💼 Бизнес': ['#business','#entrepreneur','#marketing','#success','#growth','#бизнес','#маркетинг'],
        '📸 Instagram': ['#instagram','#instagood','#reels','#explorepage','#instadaily','#instagramtips'],
        '✈️ Telegram': ['#telegram','#tgchannel','#telegramchannel','#tgbot','#telegrammarketing','#телеграм'],
        '📌 Pinterest': ['#pinterest','#pinterestmarketing','#pinspiration','#pintereststrategy','#pinteresttips','#пинтерест'],
        '📝 Блогинг': ['#blogger','#blogging','#influencer','#contentmarketing','#digitalcreator','#блогер']
    };
    let html = `<div class="hashtags-modal"><div class="modal-header"><div class="modal-title">🏷️ Добавить хэштеги</div><button class="modal-close" data-close-modal>✕</button></div><div class="modal-body"><div class="hashtags-categories">`;
    for (const [cat, tags] of Object.entries(categories)) {
        html += `<div class="hashtag-category"><div class="category-title">${cat}</div><div class="category-tags">${tags.map(t => `<button class="hashtag-btn" onclick="addHashtagToEditor('${t}')">${t}</button>`).join('')}</div></div>`;
    }
    html += `</div><div class="custom-hashtag"><input type="text" id="custom-hashtag-input" class="form-input" placeholder="Свой хэштег..." /><button class="btn btn--primary" onclick="addCustomHashtag()">➕ Добавить</button></div></div><div class="modal-footer"><button class="btn btn--secondary" onclick="insertPopularHashtags()">✨ Вставить популярные</button><button class="btn btn--ghost" onclick="closeModal()">Закрыть</button></div></div>`;
    openModal(html);
}
function addHashtagToEditor(tag) {
    const postOutput = document.getElementById('post-output');
    postOutput.value = postOutput.value + ' ' + tag;
    autoResize(postOutput);
    if (currentIdeaId && !isEditing) { const idea = appState.ideas.find(i => i.id === currentIdeaId); if (idea) { idea.postText = postOutput.value; saveState(); } }
    showNotification(`➕ Добавлен ${tag}`, 'success');
}
function addCustomHashtag() {
    const input = document.getElementById('custom-hashtag-input');
    let tag = input?.value.trim();
    if (!tag) { showNotification('Введите хэштег', 'warning'); return; }
    if (!tag.startsWith('#')) tag = '#' + tag;
    addHashtagToEditor(tag);
    if (input) input.value = '';
}
function insertPopularHashtags() {
    const popular = ['#contentcreator','#socialmedia','#viral','#trending','#fyp'];
    popular.forEach(tag => addHashtagToEditor(tag));
    closeModal();
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
function init() {
    appState = loadState();
    
    // Привязываем глобальные обработчики
    window.generateAutoIdeas = generateAutoIdeas;
    window.addHashtagToEditor = addHashtagToEditor;
    window.addCustomHashtag = addCustomHashtag;
    window.insertPopularHashtags = insertPopularHashtags;
    window.markAsPublished = markAsPublished;
    window.markAsDraft = markAsDraft;
    
    // Навигация
    document.querySelectorAll('.navlink[data-page]').forEach(btn => btn.addEventListener('click', () => setActivePage(btn.getAttribute('data-page'))));
    
    // Кнопки
    document.getElementById('btn-generate-auto')?.addEventListener('click', openAutoGenerateModal);
    document.getElementById('btn-add-hashtags')?.addEventListener('click', openHashtagsModal);
    document.getElementById('btn-generate-idea')?.addEventListener('click', () => {
        const topic = document.getElementById('idea-topic')?.value.trim();
        if (!topic) { showNotification('❌ Введите тему поста', 'warning'); return; }
        const newIdea = addIdea({ topic, tagKey: document.getElementById('idea-tag')?.value, text: document.getElementById('idea-text')?.value.trim() || '', direction: document.getElementById('direction-select')?.value });
        generatePostForIdea(newIdea.id, true);
    });
    document.getElementById('btn-save-idea')?.addEventListener('click', saveCurrentIdea);
    document.getElementById('btn-add-idea')?.addEventListener('click', addEmptyIdea);
    document.getElementById('btn-add-to-calendar')?.addEventListener('click', addToCalendar);
    document.getElementById('btn-copy-post')?.addEventListener('click', copyPost);
    document.getElementById('btn-edit-post')?.addEventListener('click', editPost);
    document.getElementById('btn-like-post')?.addEventListener('click', likeCurrentPost);
    document.getElementById('btn-regenerate-post')?.addEventListener('click', regeneratePost);
    document.getElementById('btn-generate-excel')?.addEventListener('click', exportToExcel);
    document.getElementById('btn-export-json')?.addEventListener('click', exportToJSON);
    document.getElementById('btn-clear')?.addEventListener('click', clearAllData);
    
    // Календарь навигация
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    const todayBtn = document.getElementById('cal-today');
    if (prevBtn) prevBtn.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth()-1); renderCalendar(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth()+1); renderCalendar(); });
    if (todayBtn) todayBtn.addEventListener('click', () => { calCursor = new Date(); renderCalendar(); });
    
    // Дата по умолчанию
    if (document.getElementById('plan-date') && !document.getElementById('plan-date').value) document.getElementById('plan-date').value = formatISODate(new Date());
    
    // Auto-resize
    document.querySelectorAll('.auto-resize').forEach(autoResize);
    const postOutput = document.getElementById('post-output');
    if (postOutput) postOutput.addEventListener('input', () => autoResize(postOutput));
    
    // Начальный рендер
    renderIdeas();
    renderCalendar();
    renderTemplates();
    updateStats();
    setActivePage('planner');
    
    // Загружаем шаблоны из Firebase
    if (window.db) {
        loadTemplatesFromFirebase();
    }
    
    showNotification('🎉 Glitchless Pin готов к работе! Шаблоны синхронизируются с облаком', 'success');
}

// Запуск
document.addEventListener('DOMContentLoaded', init);
window.closeModal = closeModal;