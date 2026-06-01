// ============ КОНФИГУРАЦИЯ ============

import { aiAnimation } from './modules/ai-animation.js';
import { aiManager } from './modules/ai-models.js';


// Плавный скролл к панели поста (только на мобилках)
function scrollToPostPanel() {
    // Только на мобилках (ширина экрана <= 768px)
    if (window.innerWidth > 768) return;
    
    const postPanel = document.getElementById('post-panel');
    if (postPanel) {
      setTimeout(() => {
        postPanel.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }

const CONFIG = {
    LS_KEY: 'glitchless-pin-v3',
    USER_ID_KEY: 'glitchless-pin-user-id',
    HIDDEN_TEMPLATES_KEY: 'glitchless-pin-hidden-templates',
};

function getUserId() {
    let id = localStorage.getItem(CONFIG.USER_ID_KEY);
    if (!id) {
        id = uid();
        localStorage.setItem(CONFIG.USER_ID_KEY, id);
    }
    return id;
}

function getHiddenTemplatesSet() {
    const raw = localStorage.getItem(CONFIG.HIDDEN_TEMPLATES_KEY);
    if (!raw) return new Set();
    try {
        const parsed = JSON.parse(raw);
        const userId = getUserId();
        const arr = parsed?.[userId] || [];
        return new Set(arr);
    } catch {
        return new Set();
    }
}

function addHiddenTemplateForCurrentUser(templateId) {
    const userId = getUserId();
    const raw = localStorage.getItem(CONFIG.HIDDEN_TEMPLATES_KEY);
    let parsed = {};
    try {
        parsed = raw ? JSON.parse(raw) : {};
    } catch {
        parsed = {};
    }
    if (!Array.isArray(parsed[userId])) parsed[userId] = [];
    if (!parsed[userId].includes(templateId)) parsed[userId].push(templateId);
    localStorage.setItem(CONFIG.HIDDEN_TEMPLATES_KEY, JSON.stringify(parsed));
}

// ============ ГЛОБАЛЬНОЕ СОСТОЯНИЕ ============
let appState = { ideas: [], calendar: [], templates: [], version: 3 };
let currentIdeaId = null;
let isEditing = false;
let templateFilters = {
    platform: 'all',
    direction: 'all',
    search: ''
};

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

// ============ МОБИЛЬНАЯ АДАПТАЦИЯ: ОБРАБОТКА КЛАВИАТУРЫ ============
function initKeyboardHandling() {
    const inputs = document.querySelectorAll('input, textarea, select');
    let scrollTimeout;
    
    const onFocus = (e) => {
        setTimeout(() => {
            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        
        if (window.innerWidth <= 768) {
            document.body.classList.add('keyboard-open');
        }
    };
    
    const onBlur = () => {
        if (window.innerWidth <= 768) {
            document.body.classList.remove('keyboard-open');
        }
    };
    
    inputs.forEach(input => {
        input.removeEventListener('focus', onFocus);
        input.removeEventListener('blur', onBlur);
        input.addEventListener('focus', onFocus);
        input.addEventListener('blur', onBlur);
    });
    
    window.addEventListener('resize', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    });
}

// ============ УВЕДОМЛЕНИЯ ============
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

// ============ МОДАЛЬНЫЕ ОКНА ============
function openModal(html) {
    const modalRoot = document.getElementById('modal-root');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = html;
    modalRoot.classList.remove('hidden');
    setTimeout(() => modalBackdrop.classList.add('show'), 10);
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
        const modalRoot = document.getElementById('modal-root');
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = html;
        modalRoot.classList.remove('hidden');
        setTimeout(() => modalBackdrop.classList.add('show'), 10);
        const yesBtn = modalContent.querySelector('[data-confirm-yes]');
        const noBtn = modalContent.querySelector('[data-confirm-no]');
        const cleanup = () => {
            modalBackdrop.classList.remove('show');
            setTimeout(() => {
                modalRoot.classList.add('hidden');
                modalContent.innerHTML = '';
            }, 200);
        };
        yesBtn.onclick = () => { cleanup(); resolve(true); };
        noBtn.onclick = () => { cleanup(); resolve(false); };
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) { cleanup(); resolve(false); }
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
                    <input type="text" id="prompt-input" class="dialog-input" value="${escapeHtml(defaultValue)}" placeholder="Введите текст..." />
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
        okBtn.onclick = () => { const value = input?.value || ''; cleanup(); resolve(value); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) { cleanup(); resolve(null); }
        };
        setTimeout(() => input?.focus(), 100);
    });
}

// ============ СОХРАНЕНИЕ/ЗАГРУЗКА ЛОКАЛЬНОГО СОСТОЯНИЯ ============
function loadState() {
    const raw = localStorage.getItem(CONFIG.LS_KEY);
    if (!raw) return { ideas: [], calendar: [], templates: [], version: 3 };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.templates) parsed.templates = [];
        if (!parsed.calendar) parsed.calendar = [];
        return parsed;
    } catch { 
        return { ideas: [], calendar: [], templates: [], version: 3 }; 
    }
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
}

// ============ FIREBASE ДЛЯ ШАБЛОНОВ ============
async function loadAllTemplatesFromFirebase() {
    if (!window.db) {
        console.warn('⚠️ Firebase не инициализирован');
        return [];
    }
    try {
        const templatesCollection = window.firebaseCollection(window.db, 'templates');
        const querySnapshot = await window.firebaseGetDocs(templatesCollection);
        const templates = [];
        querySnapshot.forEach((doc) => {
            templates.push({ id: doc.id, ...doc.data() });
        });
        return templates;
    } catch (error) {
        console.error('❌ Ошибка загрузки шаблонов:', error);
        return [];
    }
}

async function saveTemplateToFirebase(template) {
    if (!window.db) {
        console.warn('⚠️ Firebase не инициализирован, сохраняем локально');
        return true;
    }
    try {
        await window.firebaseSetDoc(window.firebaseDoc(window.db, 'templates', template.id), {
            ideaId: template.ideaId,
            postText: template.postText,
            topic: template.topic,
            direction: template.direction,
            tagKey: template.tagKey,
            likedAt: template.likedAt || new Date().toISOString()
        });
        console.log(`✅ Шаблон ${template.id} сохранён в Firebase`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения шаблона:', error);
        return false;
    }
}

async function deleteTemplateFromFirebase(templateId) {
    if (!window.db) {
        console.warn('⚠️ Firebase не инициализирован');
        return true;
    }
    try {
        await window.firebaseDeleteDoc(window.firebaseDoc(window.db, 'templates', templateId));
        console.log(`✅ Шаблон ${templateId} удалён из Firebase`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка удаления шаблона:', error);
        return false;
    }
}

// ============ AI ГЕНЕРАЦИЯ ============
// Функция получения настроек генерации
function getGenerationSettings() {
    return {
        emojis: document.getElementById('setting-emojis')?.checked ?? true,
        hashtags: document.getElementById('setting-hashtags')?.checked ?? true,
        length: document.getElementById('setting-length')?.value ?? 'medium',
        tone: document.getElementById('setting-tone')?.value ?? 'friendly'
    };
}

// Функция получения текста правил для AI на основе настроек
function getGenerationRules(settings) {
    let rules = [];
    
    // Настройка эмодзи
    if (settings.emojis) {
        rules.push('- Используй эмодзи для вовлечения (2-4 штуки, уместно)');
    } else {
        rules.push('- НЕ используй эмодзи вообще, пиши обычным текстом');
    }
    
    // Настройка хэштегов
    if (settings.hashtags) {
        rules.push('- В конце добавь 3-5 релевантных хэштегов');
    } else {
        rules.push('- НЕ добавляй хэштеги в конце поста');
    }
    
    // Настройка длины
    switch (settings.length) {
        case 'short':
            rules.push('- Длина поста: 300-500 символов (кратко и по делу)');
            break;
        case 'medium':
            rules.push('- Длина поста: 500-800 символов (оптимально для соцсетей)');
            break;
        case 'long':
            rules.push('- Длина поста: 800-1200 символов (развёрнуто, с примерами)');
            break;
        case 'xlong':
            rules.push('- Длина поста: 1200-2000 символов (максимально подробно)');
            break;
    }
    
    // Настройка тона
    switch (settings.tone) {
        case 'friendly':
            rules.push('- Тон: дружелюбный, разговорный, обращайся на "ты"');
            break;
        case 'professional':
            rules.push('- Тон: профессиональный, экспертный, используй термины по теме');
            break;
        case 'humorous':
            rules.push('- Тон: с юмором, ироничный, но не перебарщивай');
            break;
        case 'emotional':
            rules.push('- Тон: эмоциональный, вдохновляющий, используй восклицания');
            break;
        case 'strict':
            rules.push('- Тон: деловой, сухой, без воды, только факты');
            break;
    }
    
    return rules.join('\n');
}

// ОБНОВЛЕННАЯ функция generateAIPost
async function generateAIPost(topic, direction, platform, details = '') {
    const API_KEY = window.OPENROUTER_API_KEY;
    if (!API_KEY) {
        throw new Error('API ключ не загружен. Проверьте Firestore (config/api)');
    }
    
    // Получаем настройки пользователя
    const settings = getGenerationSettings();
    const customRules = getGenerationRules(settings);
    
    const systemPrompt = `Ты профессиональный копирайтер. Напиши ГОТОВЫЙ ПОСТ для публикации.

Тема: "${topic}"
Платформа: ${platform}
Направление: ${direction}
${details ? `Дополнительно: ${details}` : ''}

ПРАВИЛА НАПИСАНИЯ:
${customRules}

ОСНОВНЫЕ ТРЕБОВАНИЯ:
1. Начни с цепляющего заголовка
2. !!!Разбей на короткие абзацы (по 1-2 предложения)
3. Добавь призыв к действию
4. Пиши чистым текстом, без markdown-разметки
5. НЕ используй символы-разделители (***, ---, ___)`;

    const userPrompt = `Напиши пост на тему: "${topic}"`;
    
    // Используем умный менеджер с перебором моделей
    const result = await aiManager.generateWithRetry(systemPrompt, userPrompt, API_KEY);
    
    if (!result.success) {
        throw new Error(result.message);
    }
    
    // Постгенерационная обработка (на случай, если AI нарушил правила)
    let post = result.text;
    
    // Если хэштеги выключены, но AI их добавил - удаляем (сохраняя структуру)
if (!settings.hashtags) {
    // Удаляем только строки с хэштегами, остальное оставляем
    const lines = post.split('\n');
    const filteredLines = lines.filter(line => {
        // Проверяем, не состоит ли строка только из хэштегов и пробелов
        const hashtagsOnly = line.replace(/#[\wа-яё]+/gi, '').replace(/\s/g, '').length === 0;
        return !hashtagsOnly;
    });
    post = filteredLines.join('\n');
    
    // Дополнительная чистка: удаляем одиночные хэштеги в тексте
    post = post.replace(/#[\wа-яё]+/g, '');
    
    // Убираем лишние пробелы, но сохраняем переносы строк
    post = post.replace(/[ \t]+/g, ' ').trim();
}
    
    // Если эмодзи выключены, но AI их добавил - удаляем
    if (!settings.emojis) {
        post = post.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim();
    }
    
    return post;
}

async function generatePostForIdea(ideaId, showInEditor = true) {
    const idea = appState.ideas.find(i => i.id === ideaId);
    if (!idea) {
        showNotification('❌ Идея не найдена', 'error');
        return;
    }
    
    const btn = document.querySelector(`[data-generate-id="${ideaId}"]`);
    const originalHTML = btn?.innerHTML;
    
    // ЗАПУСКАЕМ АНИМАЦИЮ
    if (showInEditor) {
        aiAnimation.start();
    }
    
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
            updateLikeButton();
            
            // Плавный скролл к посту на мобилках
            scrollToPostPanel();
          }
        
        // ЗАВЕРШАЕМ АНИМАЦИЮ
        aiAnimation.finish();
        
        if (btn) {
            btn.innerHTML = '✅ Готово!';
            setTimeout(() => { if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; } }, 1500);
        }
        showNotification('✨ Пост сгенерирован!', 'success');
        
    } // В блоке catch в функции generatePostForIdea:
    catch (error) {
        console.error(error);
        
        // Показываем красивое сообщение об ошибке с предложениями
        if (aiAnimation) {
            const suggestions = [
                '💡 Попробуйте другую тему',
                '💡 Воспользуйтесь готовыми шаблонами ⭐',
                '💡 Обновите страницу',
                '💡 Попробуйте позже'
            ];
            aiAnimation.showError(error.message, suggestions);
        } else {
            showNotification(error.message, 'error');
        }
        
        if (btn) {
            btn.innerHTML = '❌ Ошибка';
            setTimeout(() => { if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; } }, 3000);
        }
    }
}

// ============ CRUD ИДЕИ ============
function addIdea({ topic, tagKey, text, direction }) {
    const newIdea = { 
        id: uid(), 
        topic: topic.trim(), 
        tagKey, 
        details: text.trim(), 
        direction, 
        createdAt: Date.now(), 
        postText: '', 
        calendarDate: '', 
        notes: '' 
    };
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
    if (currentIdeaId === id) { 
        currentIdeaId = null; 
        document.getElementById('post-output').value = ''; 
        document.getElementById('post-output').placeholder = '✨ Здесь появится готовый пост после генерации...'; 
    }
    showNotification('✅ Идея удалена', 'info');
}

// ============ РЕНДЕР ИДЕЙ ============
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
                <div class="idea-card-header">
                    <div class="idea-badges">
                        <span class="idea-tag">${tagIcons[idea.tagKey] || '📌'} ${idea.tagKey}</span>
                        <span class="idea-direction">${dirIcons[idea.direction] || '🎓'} ${idea.direction}</span>
                    </div>
                </div>
                <div class="idea-title">${escapeHtml(idea.topic)}</div>
                ${idea.details ? `<div class="idea-details">${escapeHtml(idea.details.substring(0,80))}${idea.details.length>80?'...':''}</div>` : ''}
                <div class="idea-actions">
                    ${!hasPost 
                        ? `<button class="idea-btn idea-btn-generate" data-generate-id="${idea.id}">🚀 Сгенерировать</button>` 
                        : `<button class="idea-btn idea-btn-view" data-view-id="${idea.id}">👁️ Смотреть пост</button>`
                    }
                    <button class="idea-btn idea-btn-delete" data-delete-id="${idea.id}">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.querySelectorAll('.idea-btn-generate').forEach(btn => {
        btn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            generatePostForIdea(btn.getAttribute('data-generate-id'), true); 
        });
    });
    
    container.querySelectorAll('.idea-btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-view-id');
          const idea = appState.ideas.find(i => i.id === id);
          if (idea && idea.postText) {
            currentIdeaId = id;
            document.getElementById('post-output').value = idea.postText;
            autoResize(document.getElementById('post-output'));
            document.getElementById('plan-date').value = idea.calendarDate || formatISODate(new Date());
            document.getElementById('plan-notes').value = idea.notes || '';
            updateLikeButton();
            showNotification('📄 Пост загружен в редактор', 'success');
            
            // Добавь эту строку
            scrollToPostPanel();
          }
        });
      });
    
    container.querySelectorAll('.idea-btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            deleteIdea(btn.getAttribute('data-delete-id')); 
        });
    });
}

// ============ ОБНОВЛЕНИЕ КНОПКИ ЛАЙКА ============
async function updateLikeButton() {
    const likeBtn = document.getElementById('btn-like-post');
    if (!likeBtn) return;
    
    if (!currentIdeaId) {
        likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Сохранить в шаблоны';
        likeBtn.disabled = false;
        likeBtn.classList.remove('opacity-50');
        return;
    }
    
    const isLikedLocally = appState.templates?.some(t => t.ideaId === currentIdeaId);
    
    if (isLikedLocally) {
        likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> В шаблонах ✅';
        likeBtn.disabled = true;
        likeBtn.classList.add('opacity-50');
    } else {
        likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Сохранить в шаблоны';
        likeBtn.disabled = false;
        likeBtn.classList.remove('opacity-50');
    }
}

// ============ ЛАЙК ПОСТА (СОХРАНЕНИЕ В ШАБЛОНЫ) ============
async function likeCurrentPost() {
    if (!currentIdeaId) { 
        showNotification('❌ Нет активного поста', 'warning'); 
        return; 
    }
    
    const idea = appState.ideas.find(i => i.id === currentIdeaId);
    if (!idea || !idea.postText) { 
        showNotification('❌ Сначала сгенерируйте пост', 'warning'); 
        return; 
    }
    
    if (appState.templates?.some(t => t.ideaId === currentIdeaId)) {
        showNotification('⭐ Пост уже в шаблонах', 'info');
        return;
    }
    
    const newTemplate = {
        id: uid(),
        ideaId: currentIdeaId,
        postText: idea.postText,
        topic: idea.topic,
        direction: idea.direction,
        tagKey: idea.tagKey,
        likedAt: new Date().toISOString()
    };
    
    const saved = await saveTemplateToFirebase(newTemplate);
    
    if (saved) {
        if (!appState.templates) appState.templates = [];
        appState.templates.push(newTemplate);
        saveState();
        
        updateLikeButton();
        renderTemplates();
        updateStats();
        
        showNotification('❤️ Пост сохранён в облачные шаблоны!', 'success');
    } else {
        showNotification('❌ Ошибка сохранения в облако', 'error');
    }
}

// ============ РЕНДЕР ШАБЛОНОВ С ФИЛЬТРАМИ ============
function renderTemplates() {
    const container = document.getElementById('templates-list');
    const badge = document.getElementById('templates-badge');
    if (!container) return;
    
    let templates = [...(appState.templates || [])];
    
    if (templateFilters.platform !== 'all') {
        templates = templates.filter(t => t.tagKey === templateFilters.platform);
    }
    if (templateFilters.direction !== 'all') {
        templates = templates.filter(t => t.direction === templateFilters.direction);
    }
    if (templateFilters.search) {
        const search = templateFilters.search.toLowerCase();
        templates = templates.filter(t => 
            t.topic?.toLowerCase().includes(search) || 
            t.postText?.toLowerCase().includes(search)
        );
    }
    
    templates.sort((a, b) => new Date(b.likedAt) - new Date(a.likedAt));
    
    if (badge) badge.textContent = appState.templates.length;
    
    const filtersContainer = document.getElementById('templates-filters');
    if (filtersContainer && !filtersContainer.querySelector('.filter-bar')) {
        filtersContainer.innerHTML = `
            <div class="filter-bar">
                <div class="filter-group">
                    <label class="filter-label">📱 Платформа</label>
                    <select id="filter-platform" class="filter-select">
                        <option value="all">Все платформы</option>
                        <option value="Pinterest">📌 Pinterest</option>
                        <option value="Insta">📸 Instagram</option>
                        <option value="TG">✈️ Telegram</option>
                        <option value="Блог">📝 Блог</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="filter-label">🎯 Направление</label>
                    <select id="filter-direction" class="filter-select">
                        <option value="all">Все направления</option>
                        <option value="Экспертность">🎓 Экспертность</option>
                        <option value="Польза">💡 Польза</option>
                        <option value="Продажа">💰 Продажа</option>
                    </select>
                </div>
                <div class="filter-group flex-1">
                    <label class="filter-label">🔍 Поиск</label>
                    <input type="text" id="filter-search" class="filter-input" placeholder="Поиск по теме или тексту..." />
                </div>
            </div>
        `;
        
        document.getElementById('filter-platform')?.addEventListener('change', (e) => {
            templateFilters.platform = e.target.value;
            renderTemplates();
        });
        document.getElementById('filter-direction')?.addEventListener('change', (e) => {
            templateFilters.direction = e.target.value;
            renderTemplates();
        });
        document.getElementById('filter-search')?.addEventListener('input', (e) => {
            templateFilters.search = e.target.value;
            renderTemplates();
        });
    }
    
    if (templates.length === 0) {
        container.innerHTML = `
            <div class="col-span-full empty-templates">
                <div class="empty-icon">⭐</div>
                <p>${appState.templates.length === 0 ? 'Нет избранных шаблонов' : 'Нет шаблонов по фильтрам'}</p>
                <p class="empty-hint">${appState.templates.length === 0 ? 'Лайкайте посты сердечком, они сохранятся в облако' : 'Измените параметры фильтрации'}</p>
            </div>
        `;
        return;
    }
    
    const tagIcons = { Pinterest: '📌', Insta: '📸', TG: '✈️', Блог: '📝' };
    const dirIcons = { Экспертность: '🎓', Польза: '💡', Продажа: '💰' };
    
    container.innerHTML = templates.map(t => `
        <div class="template-card">
            <div class="template-header">
                <div class="template-badges">
                    <span class="template-tag">${tagIcons[t.tagKey]||'📌'} ${t.tagKey}</span>
                    <span class="template-direction">${dirIcons[t.direction]||'🎓'} ${t.direction}</span>
                </div>
                <button class="template-delete" data-id="${t.id}">🗑️</button>
            </div>
            <div class="template-title">${escapeHtml(t.topic)}</div>
            <div class="template-preview">${escapeHtml((t.postText || '').substring(0, 120))}...</div>
            <div class="template-date">❤️ ${new Date(t.likedAt).toLocaleDateString('ru-RU')}</div>
            <button class="template-use" data-id="${t.id}">📋 Использовать шаблон</button>
        </div>
    `).join('');
    
    container.querySelectorAll('.template-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const confirmed = await customConfirm('Удалить из шаблонов?', 'Подтверждение');
            if (confirmed) {
                addHiddenTemplateForCurrentUser(id);
                appState.templates = appState.templates.filter(t => t.id !== id);
                saveState();
                renderTemplates();
                updateStats();
                updateLikeButton();
                showNotification('Удалено из шаблонов', 'info');
            }
        });
    });
    
    container.querySelectorAll('.template-use').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const template = appState.templates.find(t => t.id === id);
            if (template) {
                currentIdeaId = template.ideaId;
                document.getElementById('post-output').value = template.postText;
                autoResize(document.getElementById('post-output'));
                document.getElementById('plan-date').value = formatISODate(new Date());
                document.getElementById('plan-notes').value = '';
                updateLikeButton();
                setActivePage('planner');
                showNotification('📋 Шаблон загружен в редактор', 'success');
            }
        });
    });
}

// ============ КАЛЕНДАРЬ ============
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
    (appState.calendar || []).forEach(item => { 
        if (item.date) { 
            if (!calendarItems[item.date]) calendarItems[item.date] = []; 
            calendarItems[item.date].push(item); 
        } 
    });
    const weekdays = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    const todayStr = formatISODate(new Date());
    const DIR_COLORS = { Экспертность: '#3b82f6', Польза: '#22c55e', Продажа: '#ef4444' };
    const DIR_ICONS = { Экспертность: '🎓', Польза: '💡', Продажа: '💰' };
    
    let html = `<div class="calendar-header">
        <button class="calendar-nav-btn" id="cal-prev-month">◀</button>
        <div class="calendar-month-title">${calCursor.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</div>
        <button class="calendar-nav-btn" id="cal-next-month">▶</button>
        <button class="calendar-today-btn" id="cal-today">📅 Сегодня</button>
    </div>
    <div class="calendar-weekdays">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}</div>
    <div class="calendar-days">`;
    
    for (let i = 0; i < startOffset; i++) html += `<div class="calendar-day empty"></div>`;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const items = calendarItems[dateStr] || [];
        const isToday = dateStr === todayStr;
        html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
            <div class="calendar-day-number">${day}</div>
            <div class="calendar-items">`;
        
        items.slice(0,3).forEach(item => {
            const idea = appState.ideas?.find(i => i.id === item.ideaId);
            const isPublished = item.published || false;
            html += `<div class="calendar-item ${isPublished ? 'published' : ''}" data-item-id="${item.id}" data-date="${dateStr}" draggable="true" style="border-left-color: ${DIR_COLORS[item.direction] || '#64748b'}">
                <span class="item-icon">${DIR_ICONS[item.direction] || '📝'}</span>
                <span class="item-title">${escapeHtml(idea?.topic?.substring(0,20) || item.direction)}</span>
                ${isPublished ? '<span class="published-badge">✓</span>' : ''}
            </div>`;
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
    const items = document.querySelectorAll('.calendar-item:not(.empty-slot)');
    const days = document.querySelectorAll('.calendar-day:not(.empty)');
    
    items.forEach(item => {
        item.setAttribute('draggable','true');
        item.addEventListener('dragstart', (e) => { 
            dragSource = { 
                id: item.getAttribute('data-item-id'), 
                fromDate: item.getAttribute('data-date') 
            }; 
            e.dataTransfer.setData('text/plain', JSON.stringify(dragSource)); 
            item.style.opacity='0.5'; 
        });
        item.addEventListener('dragend', () => { 
            item.style.opacity=''; 
            dragSource=null; 
        });
        item.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            const id = item.getAttribute('data-item-id'); 
            const calItem = appState.calendar?.find(c => c.id === id); 
            if (calItem) openPostModal(calItem); 
        });
    });
    
    days.forEach(day => {
        day.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
            day.classList.add('drag-over'); 
        });
        day.addEventListener('dragleave', () => { 
            day.classList.remove('drag-over'); 
        });
        day.addEventListener('drop', (e) => { 
            e.preventDefault(); 
            day.classList.remove('drag-over'); 
            const toDate = day.getAttribute('data-date'); 
            if (dragSource && toDate !== dragSource.fromDate) { 
                const calItem = appState.calendar?.find(c => c.id === dragSource.id); 
                if (calItem) { 
                    calItem.date = toDate; 
                    const idea = appState.ideas?.find(i => i.id === calItem.ideaId); 
                    if (idea) idea.calendarDate = toDate; 
                    saveState(); 
                    renderCalendar(); 
                    showNotification('📅 Дата изменена', 'success'); 
                } 
            } 
        });
    });
}

function openPostModal(calItem) {
    const idea = appState.ideas?.find(i => i.id === calItem.ideaId);
    const html = `<div class="custom-modal post-modal">
        <div class="modal-header">
            <div class="modal-title">📝 ${escapeHtml(idea?.topic || 'Пост')}</div>
            <button class="modal-close" data-close-modal>✕</button>
        </div>
        <div class="modal-body">
            <div class="post-modal-text">${escapeHtml(idea?.postText || 'Текст не найден').replace(/\n/g, '<br>')}</div>
        </div>
        <div class="modal-footer">
            <button class="btn btn--secondary" data-close-modal>Закрыть</button>
            <button class="btn btn--secondary" data-copy-post>📋 Копировать</button>
            <button class="btn btn--primary" data-mark-published="${calItem.id}">${calItem.published ? '✅ Опубликовано' : '📢 Отметить опубликованным'}</button>
        </div>
    </div>`;
    openModal(html);
    
    // Копирование текста поста
    const copyBtn = document.querySelector('[data-copy-post]');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const postTextDiv = document.querySelector('.post-modal-text');
            let textToCopy = idea?.postText || '';
            if (postTextDiv) {
                textToCopy = postTextDiv.innerText || postTextDiv.textContent;
            }
            navigator.clipboard.writeText(textToCopy).then(() => {
                showNotification('📋 Текст поста скопирован!', 'success');
            }).catch(() => {
                showNotification('❌ Не удалось скопировать', 'error');
            });
        });
    }
    
    // Отметка "опубликовано"
    const publishBtn = document.querySelector('[data-mark-published]');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
            calItem.published = !calItem.published;
            saveState();
            renderCalendar();
            closeModal();
            showNotification(calItem.published ? '📢 Пост отмечен опубликованным!' : '📝 Статус сброшен', 'success');
        });
    }
}

function addToCalendar() {
    if (!currentIdeaId) { 
        showNotification('❌ Сначала сгенерируйте пост', 'warning'); 
        return; 
    }
    const idea = appState.ideas.find(i => i.id === currentIdeaId);
    if (!idea || !idea.postText) { 
        showNotification('❌ Сначала сгенерируйте пост', 'warning'); 
        return; 
    }
    const date = document.getElementById('plan-date')?.value || formatISODate(new Date());
    const notes = document.getElementById('plan-notes')?.value || '';
    const existing = appState.calendar?.find(c => c.ideaId === currentIdeaId);
    if (existing) {
        customConfirm('📅 Этот пост уже в календаре. Обновить дату?', 'Подтверждение').then(confirmed => {
            if (confirmed) { 
                existing.date = date; 
                existing.notes = notes; 
                idea.calendarDate = date; 
                idea.notes = notes; 
                saveState(); 
                renderCalendar(); 
                showNotification('📅 Дата обновлена!', 'success'); 
            }
        });
        return;
    }
    appState.calendar.push({ 
        id: uid(), 
        date, 
        ideaId: currentIdeaId, 
        direction: idea.direction, 
        tagKey: idea.tagKey, 
        notes, 
        published: false, 
        createdAt: new Date().toISOString() 
    });
    idea.calendarDate = date; 
    idea.notes = notes;
    saveState(); 
    renderCalendar(); 
    showNotification('✅ Пост добавлен в календарь!', 'success'); 
    setActivePage('calendar');
}

// ============ СТАТИСТИКА ============
function updateStats() {
    const ideasCount = appState.ideas?.length || 0;
    const postsCount = appState.ideas?.filter(i => i.postText).length || 0;
    const templatesCount = appState.templates?.length || 0;
    const daysCount = new Set(appState.calendar?.map(c => c.date) || []).size;
    
    const statIdeas = document.getElementById('stat-ideas');
    const statPosts = document.getElementById('stat-posts');
    const statTemplates = document.getElementById('stat-templates');
    const statDays = document.getElementById('stat-days');
    
    if (statIdeas) statIdeas.textContent = ideasCount;
    if (statPosts) statPosts.textContent = postsCount;
    if (statTemplates) statTemplates.textContent = templatesCount;
    if (statDays) statDays.textContent = daysCount;
    
    const tagStats = {};
    const tagColors = { Pinterest: '#ef4444', Insta: '#22c55e', TG: '#3b82f6', Блог: '#f59e0b' };
    const tagIcons = { Pinterest: '📌', Insta: '📸', TG: '✈️', Блог: '📝' };
    appState.ideas?.forEach(idea => { 
        tagStats[idea.tagKey] = (tagStats[idea.tagKey] || 0) + 1; 
    });
    const tagsContainer = document.getElementById('stats-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = Object.entries(tagStats).map(([key, count]) => 
            `<div class="stat-tag-item">
                <div class="stat-tag-dot" style="background:${tagColors[key]||'#64748b'}"></div>
                <span>${tagIcons[key]||'📌'} ${key}</span>
                <span class="stat-tag-count">${count}</span>
            </div>`
        ).join('');
    }
}

// ============ НАВИГАЦИЯ ============
function setActivePage(page) {
    ['planner','templates','calendar','statistics','account'].forEach(p => { 
        const el = document.getElementById(`page-${p}`); 
        if (el) el.classList.toggle('hidden', p !== page); 
    });
    
    const titles = { 
        planner: { title: '🤖 AI Генератор постов', subtitle: 'Создайте идею → Получите готовый пост → Сохраняйте лучшие' }, 
        templates: { title: '⭐ Избранные шаблоны', subtitle: 'Ваши посты сохраняются в облако' }, 
        calendar: { title: '📅 Контент-календарь', subtitle: 'Планируйте публикации и отмечайте выполненные' }, 
        statistics: { title: '📊 Статистика', subtitle: 'Анализируйте ваш контент' }, 
        account: { title: '👤 Аккаунт', subtitle: 'Настройки и информация' } 
    };
    const title = titles[page];
    if (title) { 
        document.getElementById('page-title').textContent = title.title; 
        document.getElementById('page-subtitle').textContent = title.subtitle; 
    }
    history.replaceState({}, '', '#' + page);
    if (page === 'calendar') renderCalendar();
    if (page === 'templates') renderTemplates();
    if (page === 'planner') updateLikeButton();
}

// ============ ОСТАЛЬНЫЕ ФУНКЦИИ ============
function saveCurrentIdea() {
    const topic = document.getElementById('idea-topic')?.value.trim();
    if (!topic) { showNotification('❌ Введите тему поста', 'warning'); return; }
    addIdea({ 
        topic, 
        tagKey: document.getElementById('idea-tag')?.value, 
        text: document.getElementById('idea-text')?.value.trim() || '', 
        direction: document.getElementById('direction-select')?.value 
    });
    document.getElementById('idea-topic').value = ''; 
    document.getElementById('idea-text').value = '';
    showNotification('💾 Идея сохранена!', 'success');
}

function copyPost() {
    const postText = document.getElementById('post-output')?.value;
    if (!postText || postText === document.getElementById('post-output')?.placeholder) { 
        showNotification('❌ Нет текста для копирования', 'warning'); 
        return; 
    }
    navigator.clipboard.writeText(postText)
        .then(() => showNotification('📋 Пост скопирован!', 'success'))
        .catch(() => showNotification('❌ Не удалось скопировать', 'error'));
}

function editPost() {
    const textarea = document.getElementById('post-output');
    if (textarea.readOnly) {
        textarea.readOnly = false; 
        textarea.style.background = '#fefce8';
        document.getElementById('btn-edit-post').innerHTML = '✏️ Редактировать (активно)'; 
        textarea.focus(); 
        isEditing = true;
        showNotification('✏️ Режим редактирования включён', 'info');
    } else {
        textarea.readOnly = true; 
        textarea.style.background = '';
        document.getElementById('btn-edit-post').innerHTML = '✏️ Редактировать';
        if (currentIdeaId) { 
            const idea = appState.ideas.find(i => i.id === currentIdeaId); 
            if (idea) { 
                idea.postText = textarea.value; 
                saveState(); 
                showNotification('💾 Изменения сохранены', 'success'); 
            } 
        }
        isEditing = false;
    }
}

async function regeneratePost() {
    if (!currentIdeaId) { 
      showNotification('❌ Нет активного поста', 'warning'); 
      return; 
    }
    const confirmed = await customConfirm('🔄 Перегенерировать пост? Текущий текст будет заменён.', 'Перегенерация');
    if (confirmed) {
      const postOutput = document.getElementById('post-output');
      postOutput.value = '⏳ Генерация нового текста...';
      autoResize(postOutput);
      await generatePostForIdea(currentIdeaId, true);
      
      // Добавь эту строку
      scrollToPostPanel();
    }
  }

async function addEmptyIdea() {
    const topic = await customPrompt('📝 Введите тему поста:', '', 'Новая идея');
    if (!topic) return;
    addIdea({ 
        topic, 
        tagKey: document.getElementById('idea-tag')?.value || 'Pinterest', 
        text: '', 
        direction: document.getElementById('direction-select')?.value || 'Экспертность' 
    });
    showNotification('✨ Новая идея создана', 'success');
}

function generateAutoIdeas() {
    const topic = document.getElementById('auto-topic')?.value.trim() || 'контент-маркетинг';
    const direction = document.getElementById('auto-direction')?.value || 'Экспертность';
    const count = parseInt(document.getElementById('auto-count')?.value || '3');
    const topicsList = [
        `${topic}: 10 ошибок, которые убивают результат`,
        `Как увеличить вовлечённость в ${topic} за 5 шагов`,
        `Секреты успешного ${topic} от экспертов`,
        `Топ-5 инструментов для ${topic} в 2025`,
        `Кейс: как я вывел ${topic} на новый уровень`,
        `Почему 90% людей терпят неудачу в ${topic}`,
        `Пошаговый план для начинающих в ${topic}`,
        `${topic} для чайников: с чего начать?`,
        `Как монетизировать ${topic} и заработать первые деньги`
    ];
    for (let i = 0; i < Math.min(count, topicsList.length); i++) {
        addIdea({ 
            topic: topicsList[i], 
            tagKey: ['Pinterest','Insta','TG','Блог'][Math.floor(Math.random()*4)], 
            text: `Авто-генерация по теме "${topic}"`, 
            direction 
        });
    }
    closeModal(); 
    showNotification(`✨ Добавлено ${count} идей на тему "${topic}"`, 'success');
}

function openAutoGenerateModal() {
    const html = `<div class="custom-modal auto-generate-modal">
        <div class="modal-header">
            <div class="modal-title">🎲 Авто-генерация идей</div>
            <button class="modal-close" data-close-modal>✕</button>
        </div>
        <div class="modal-body">
            <div class="form-group"><label class="form-label">🎯 Тема / Ниша</label><input type="text" id="auto-topic" class="form-input" placeholder="Например: маркетинг, здоровье, бизнес..." /></div>
            <div class="form-group"><label class="form-label">📊 Направление</label><select id="auto-direction" class="form-select"><option value="Экспертность">🎓 Экспертность</option><option value="Польза">💡 Польза</option><option value="Продажа">💰 Продажа</option></select></div>
            <div class="form-group"><label class="form-label">🔢 Количество идей</label><select id="auto-count" class="form-select"><option value="3">3 идеи</option><option value="5">5 идей</option><option value="10">10 идей</option></select></div>
        </div>
        <div class="modal-footer"><button class="btn btn--ghost" onclick="closeModal()">Отмена</button><button class="btn btn--primary" onclick="generateAutoIdeas()">🚀 Сгенерировать</button></div>
    </div>`;
    openModal(html);
}

// ============ ЭКСПОРТ ============
function exportToJSON() {
    const exportData = { 
        ideas: appState.ideas, 
        calendar: appState.calendar, 
        templates: appState.templates, 
        exportedAt: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `glitchless-pin-${formatISODate(new Date())}.json`; 
    a.click(); 
    URL.revokeObjectURL(url);
    showNotification('💾 JSON экспортирован!', 'success');
}

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        showNotification('❌ Библиотека Excel не загружена', 'error');
        return;
    }
    
    // Собираем данные для экспорта: все идеи, у которых есть сгенерированный пост
    const exportItems = [];
    
    // 1. Добавляем все идеи с готовыми постами
    (appState.ideas || []).forEach(idea => {
        if (idea.postText && idea.postText.trim()) {
            exportItems.push({
                'Дата создания': new Date(idea.createdAt).toLocaleDateString('ru-RU'),
                'Платформа': idea.tagKey || '',
                'Направление': idea.direction || '',
                'Тема': idea.topic || '',
                'Текст поста': idea.postText || '',
                'Заметки': idea.notes || '',
                'Дата в календаре': idea.calendarDate || '',
                'В избранном': appState.templates?.some(t => t.ideaId === idea.id) ? 'Да' : 'Нет'
            });
        }
    });
    
    // 2. Добавляем отдельно записи календаря (даже если нет поста)
    (appState.calendar || []).forEach(item => {
        const idea = appState.ideas.find(i => i.id === item.ideaId);
        exportItems.push({
            'Дата создания': idea?.createdAt ? new Date(idea.createdAt).toLocaleDateString('ru-RU') : '',
            'Платформа': item.tagKey || idea?.tagKey || '',
            'Направление': item.direction || idea?.direction || '',
            'Тема': idea?.topic || '',
            'Текст поста': idea?.postText || '',
            'Заметки': item.notes || '',
            'Дата в календаре': item.date || '',
            'В избранном': appState.templates?.some(t => t.ideaId === item.ideaId) ? 'Да' : 'Нет'
        });
    });
    
    // 3. Если совсем ничего нет – сообщаем
    if (exportItems.length === 0) {
        showNotification('❌ Нет данных для экспорта. Сначала сгенерируйте хотя бы один пост.', 'warning');
        return;
    }
    
    // Убираем дубликаты (если идея уже добавилась и из календаря)
    const unique = [];
    const seen = new Set();
    for (const item of exportItems) {
        const key = item.Тема + item['Текст поста'];
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }
    
    // Создаём Excel файл
    const ws = XLSX.utils.json_to_sheet(unique);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Посты');
    XLSX.writeFile(wb, `glitchless-pin-${formatISODate(new Date())}.xlsx`);
    showNotification(`📊 Экспортировано ${unique.length} постов!`, 'success');
}
// ============ ТЕМЫ ============
function initThemeSwitcher() {
    const savedTheme = localStorage.getItem('glitchless-theme') || 'light';
    applyTheme(savedTheme);

    const themeBtn = document.getElementById('btn-theme-mobile');
    const menu = document.getElementById('theme-mobile-menu');
    
    if (themeBtn && menu) {
        const updateMenuChecked = (theme) => {
            menu.querySelectorAll('.theme-mobile__item').forEach(item => {
                const t = item.getAttribute('data-theme');
                const checked = t === theme;
                item.setAttribute('aria-checked', checked ? 'true' : 'false');
            });
        };
        
        const closeMenu = () => {
            themeBtn.setAttribute('aria-expanded', 'false');
            menu.classList.remove('show');
        };
        
        const openMenu = () => {
            themeBtn.setAttribute('aria-expanded', 'true');
            menu.classList.add('show');
        };
        
        updateMenuChecked(savedTheme);
        
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = themeBtn.getAttribute('aria-expanded') === 'true';
            if (isOpen) closeMenu();
            else openMenu();
        });
        
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== themeBtn) {
                closeMenu();
            }
        });
        
        menu.querySelectorAll('.theme-mobile__item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const theme = item.getAttribute('data-theme');
                applyTheme(theme);
                localStorage.setItem('glitchless-theme', theme);
                updateMenuChecked(theme);
                closeMenu();
            });
        });
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    const gradients = {
        light: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        dark: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
        moon: 'linear-gradient(135deg, #050815 0%, #0b1230 45%, #0f1b44 100%)',
        green: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        comfort: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)'
    };
    if (gradients[theme]) {
        document.body.style.background = gradients[theme];
    }
}


// ============ PWA - ADD TO HOME SCREEN ============
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtnContainer = document.getElementById('pwa-install-container');
  if (installBtnContainer) installBtnContainer.style.display = 'block';
});

const installBtn = document.getElementById('btn-install-pwa');
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      // Если браузер не поддерживает авто-установку, показываем инструкцию
      showNotification('📱 Нажмите "Поделиться" → "На экран "Домой"', 'info');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showNotification('✅ Приложение добавлено на главный экран!', 'success');
    } else {
      showNotification('❌ Установка отклонена', 'info');
    }
    deferredPrompt = null;
    const installBtnContainer = document.getElementById('pwa-install-container');
    if (installBtnContainer) installBtnContainer.style.display = 'none';
  });
}




// ============ ИНИЦИАЛИЗАЦИЯ ============
async function init() {
    appState = loadState();

    // Применяем тему максимально рано (до ожидания Firebase), чтобы не было «скачка» стилей.
    initThemeSwitcher();

    // UI рендерим сразу по локальному state.
    initKeyboardHandling();


    // Настройки генерации (сворачивание/разворачивание)
const settingsToggle = document.getElementById('settings-toggle');
const settingsBody = document.getElementById('settings-body');

if (settingsToggle && settingsBody) {
    settingsToggle.addEventListener('click', () => {
        // Важно: hidden — это класс, а не aria/стейт. Снимаем/ставим именно его.
        settingsBody.classList.toggle('hidden');
        settingsToggle.classList.toggle('open');

        // Сохраняем состояние в localStorage (строками, чтобы сравнение === 'true' работало всегда)
        const isOpen = !settingsBody.classList.contains('hidden');
        localStorage.setItem('settings-open', String(isOpen));
    });
    
    // Восстанавливаем состояние из localStorage
    const savedState = localStorage.getItem('settings-open');
    if (savedState === 'true') {
        settingsBody.classList.remove('hidden');
        settingsToggle.classList.add('open');
    }
}

// Сохраняем настройки при изменении
const saveSettings = () => {
    const settings = getGenerationSettings();
    localStorage.setItem('generation-settings', JSON.stringify(settings));
};

// Слушаем изменения настроек
['setting-emojis', 'setting-hashtags', 'setting-length', 'setting-tone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', saveSettings);
    }
});

// Загружаем сохранённые настройки
const savedSettings = localStorage.getItem('generation-settings');
if (savedSettings) {
    try {
        const settings = JSON.parse(savedSettings);
        if (document.getElementById('setting-emojis')) 
            document.getElementById('setting-emojis').checked = settings.emojis ?? true;
        if (document.getElementById('setting-hashtags')) 
            document.getElementById('setting-hashtags').checked = settings.hashtags ?? true;
        if (document.getElementById('setting-length')) 
            document.getElementById('setting-length').value = settings.length ?? 'medium';
        if (document.getElementById('setting-tone')) 
            document.getElementById('setting-tone').value = settings.tone ?? 'friendly';
    } catch(e) {}
}


    window.generateAutoIdeas = generateAutoIdeas;
    window.closeModal = closeModal;

    document.querySelectorAll('.navlink[data-page]').forEach(btn =>
        btn.addEventListener('click', () => setActivePage(btn.getAttribute('data-page')))
    );

    document.getElementById('btn-generate-auto')?.addEventListener('click', openAutoGenerateModal);
    document.getElementById('btn-generate-idea')?.addEventListener('click', () => {
        const topic = document.getElementById('idea-topic')?.value.trim();
        if (!topic) { showNotification('❌ Введите тему поста', 'warning'); return; }
        const newIdea = addIdea({ 
            topic, 
            tagKey: document.getElementById('idea-tag')?.value, 
            text: document.getElementById('idea-text')?.value.trim() || '', 
            direction: document.getElementById('direction-select')?.value 
        });
        generatePostForIdea(newIdea.id, true);
    });
    document.getElementById('btn-save-idea')?.addEventListener('click', saveCurrentIdea);
    document.getElementById('btn-add-idea')?.addEventListener('click', addEmptyIdea);
    document.getElementById('btn-add-to-calendar')?.addEventListener('click', addToCalendar);
    document.getElementById('btn-copy-post')?.addEventListener('click', copyPost);
    document.getElementById('btn-edit-post')?.addEventListener('click', editPost);
    document.getElementById('btn-like-post')?.addEventListener('click', likeCurrentPost);
    document.getElementById('btn-regenerate-post')?.addEventListener('click', regeneratePost);
    document.getElementById('btn-export-json')?.addEventListener('click', exportToJSON);
    document.getElementById('btn-generate-excel')?.addEventListener('click', exportToExcel);

    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    const todayBtn = document.getElementById('cal-today');

    if (prevBtn) prevBtn.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth()-1); renderCalendar(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { calCursor.setMonth(calCursor.getMonth()+1); renderCalendar(); });
    if (todayBtn) todayBtn.addEventListener('click', () => { calCursor = new Date(); renderCalendar(); });

    if (document.getElementById('plan-date') && !document.getElementById('plan-date').value) 
        document.getElementById('plan-date').value = formatISODate(new Date());

    document.querySelectorAll('.auto-resize').forEach(autoResize);
    const postOutput = document.getElementById('post-output');
    if (postOutput) postOutput.addEventListener('input', () => autoResize(postOutput));

    renderIdeas();
    renderCalendar();
    renderTemplates();
    updateStats();
    updateLikeButton();
    setActivePage('planner');

    // Firebase грузим параллельно, но UI уже должен быть виден.
    (async () => {
        let retries = 0;
        while (!window.db && retries < 10) {
            await new Promise(r => setTimeout(r, 500));
            retries++;
            console.log(`⏳ Ожидание Firebase... попытка ${retries}`);
        }

        if (!window.db) return;

        try {
            console.log('☁️ Загружаем шаблоны из Firebase...');
            const templatesCollection = window.firebaseCollection(window.db, 'templates');
            const querySnapshot = await window.firebaseGetDocs(templatesCollection);

            const cloudTemplates = [];
            querySnapshot.forEach((doc) => {
                cloudTemplates.push({ id: doc.id, ...doc.data() });
            });

            const existingIds = new Set(appState.templates.map(t => t.id));
            cloudTemplates.forEach(template => {
                if (!existingIds.has(template.id)) {
                    appState.templates.push(template);
                }
            });

            saveState();

            // Обновляем UI после подгрузки.
            renderTemplates();
            updateStats();
            updateLikeButton();
        } catch (error) {
            console.error('❌ Ошибка загрузки шаблонов из Firebase:', error);
        }
    })();
}






document.addEventListener('DOMContentLoaded', init);
window.closeModal = closeModal;

