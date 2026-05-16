// modules/handlers.js
import { CONFIG, appState, currentIdeaId, setCurrentIdeaId, formatISODate, autoResize, saveState } from './core.js';
import { showNotification, customConfirm, customPrompt, openModal, closeModal } from './dialogs.js';
import { addIdea, renderIdeas, deleteIdea } from './ideas.js';
import { generatePostForIdea } from './ai.js';
import { addTemplate, renderTemplates } from './templates.js';
import { addToCalendar, renderCalendar } from './calendar.js';
import { updateStats } from './stats.js';
import { setActivePage } from './navigation.js';

export async function saveCurrentIdea() {
    const topic = document.getElementById('idea-topic')?.value.trim();
    if (!topic) { showNotification('❌ Введите тему поста', 'warning'); return; }
    addIdea({ topic, tagKey: document.getElementById('idea-tag')?.value, text: document.getElementById('idea-text')?.value.trim() || '', direction: document.getElementById('direction-select')?.value });
    document.getElementById('idea-topic').value = ''; document.getElementById('idea-text').value = '';
    showNotification('💾 Идея сохранена!', 'success');
}

export function copyPost() {
    const postText = document.getElementById('post-output')?.value;
    if (!postText || postText === document.getElementById('post-output')?.placeholder) { showNotification('❌ Нет текста для копирования', 'warning'); return; }
    navigator.clipboard.writeText(postText).then(() => showNotification('📋 Пост скопирован!', 'success')).catch(() => showNotification('❌ Не удалось скопировать', 'error'));
}

export function editPost() {
    const textarea = document.getElementById('post-output');
    if (textarea.readOnly) {
        textarea.readOnly = false; textarea.style.background = '#fefce8';
        document.getElementById('btn-edit-post').innerHTML = '✏️ Редактировать (активно)'; textarea.focus();
        window.isEditing = true;
        showNotification('✏️ Режим редактирования включён', 'info');
    } else {
        textarea.readOnly = true; textarea.style.background = '';
        document.getElementById('btn-edit-post').innerHTML = '✏️ Редактировать';
        if (currentIdeaId) { const idea = appState.ideas.find(i => i.id === currentIdeaId); if (idea) { idea.postText = textarea.value; saveState(); showNotification('💾 Изменения сохранены', 'success'); } }
        window.isEditing = false;
    }
}

export function likeCurrentPost() {
    if (!currentIdeaId) { showNotification('❌ Нет активного поста', 'warning'); return; }
    const idea = appState.ideas.find(i => i.id === currentIdeaId);
    if (!idea || !idea.postText) { showNotification('❌ Сначала сгенерируйте пост', 'warning'); return; }
    addTemplate(currentIdeaId, idea.postText, idea.topic, idea.direction, idea.tagKey);
    const likeBtn = document.getElementById('btn-like-post'); likeBtn.innerHTML = '<i class="fa-solid fa-heart"></i> В шаблонах ✅'; likeBtn.disabled = true; likeBtn.classList.add('opacity-50');
}

export async function regeneratePost() {
    if (!currentIdeaId) { showNotification('❌ Нет активного поста. Сначала выберите или сгенерируйте пост.', 'warning'); return; }
    const idea = appState.ideas.find(i => i.id === currentIdeaId);
    if (!idea) { showNotification('❌ Идея не найдена', 'error'); return; }
    const confirmed = await customConfirm('🔄 Перегенерировать пост? Текущий текст будет заменён.', 'Перегенерация');
    if (!confirmed) return;
    const postOutput = document.getElementById('post-output');
    postOutput.value = '⏳ Генерация нового текста...';
    autoResize(postOutput);
    await generatePostForIdea(currentIdeaId, true);
}

export async function addEmptyIdea() {
    const topic = await customPrompt('📝 Введите тему поста:', '', 'Новая идея');
    if (!topic) return;
    addIdea({ topic, tagKey: document.getElementById('idea-tag')?.value || 'Pinterest', text: '', direction: document.getElementById('direction-select')?.value || 'Экспертность' });
    showNotification('✨ Новая идея создана', 'success');
}

export function openAutoGenerateModal() {
    const html = `<div class="custom-modal auto-generate-modal"><div class="modal-header"><div class="modal-title">🎲 Авто-генерация идей</div><button class="modal-close-btn" onclick="window.closeModal()">✕</button></div><div class="modal-body"><div class="form-group"><label class="form-label">🎯 Тема / Ниша</label><input type="text" id="auto-topic" class="form-input" placeholder="Например: маркетинг, здоровье, бизнес..." /></div><div class="form-group"><label class="form-label">📊 Направление</label><select id="auto-direction" class="form-select"><option value="Экспертность">🎓 Экспертность</option><option value="Польза">💡 Польза</option><option value="Продажа">💰 Продажа</option></select></div><div class="form-group"><label class="form-label">🔢 Количество идей</label><select id="auto-count" class="form-select"><option value="3">3 идеи</option><option value="5">5 идей</option><option value="10">10 идей</option></select></div></div><div class="modal-footer"><button class="btn btn--ghost" onclick="window.closeModal()">Отмена</button><button class="btn btn--primary" onclick="window.generateAutoIdeas()">🚀 Сгенерировать</button></div></div>`;
    openModal(html);
}

export function generateAutoIdeas() {
    const topic = document.getElementById('auto-topic')?.value.trim() || 'контент-маркетинг';
    const direction = document.getElementById('auto-direction')?.value;
    const count = parseInt(document.getElementById('auto-count')?.value || '3');
    const topicsList = [`${topic}: 10 ошибок, которые убивают результат`,`Как увеличить вовлечённость в ${topic} за 5 шагов`,`Секреты успешного ${topic} от экспертов`,`Топ-5 инструментов для ${topic} в 2024`,`Кейс: как я вывел ${topic} на новый уровень`,`Почему 90% людей терпят неудачу в ${topic}`,`Пошаговый план для начинающих в ${topic}`,`${topic} для чайников: с чего начать?`,`Как монетизировать ${topic} и заработать первые деньги`];
    for (let i = 0; i < Math.min(count, topicsList.length); i++) {
        addIdea({ topic: topicsList[i], tagKey: ['Pinterest','Insta','TG','Блог'][Math.floor(Math.random()*4)], text: `Авто-генерация по теме "${topic}"`, direction });
    }
    closeModal(); showNotification(`✨ Добавлено ${count} идей на тему "${topic}"`, 'success');
}

export function exportToExcel() {
    const data = (appState.calendar || []).map(item => { const idea = appState.ideas.find(i => i.id === item.ideaId); return { 'Дата': item.date, 'Платформа': item.tagKey, 'Направление': item.direction, 'Тема': idea?.topic || '', 'Текст поста': idea?.postText || '', 'Заметки': item.notes || '', 'Статус': item.published ? 'Опубликован' : 'Черновик' }; });
    if (data.length === 0) { showNotification('❌ Нет данных для экспорта', 'warning'); return; }
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Посты'); XLSX.writeFile(wb, `glitchless-pin-${formatISODate(new Date())}.xlsx`);
    showNotification('📊 Экспорт завершен!', 'success');
}

export function exportToJSON() {
    const exportData = { ideas: appState.ideas, calendar: appState.calendar, templates: appState.templates, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `glitchless-pin-${formatISODate(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
    showNotification('💾 JSON экспортирован!', 'success');
}

export async function clearAllData() {
    const confirmed = await customConfirm('⚠️ УДАЛЕНИЕ ВСЕХ ДАННЫХ\n\nЭто действие удалит все ваши идеи, посты, шаблоны и календарь. Данные нельзя будет восстановить.\n\nВы уверены?', 'Подтверждение удаления');
    if (confirmed) {
        localStorage.removeItem(CONFIG.LS_KEY);
        // Обновляем состояние напрямую через import
        const { setAppState } = await import('./core.js');
        setAppState({ ideas: [], calendar: [], templates: [], version: 3 });
        setCurrentIdeaId(null);
        renderIdeas(); renderCalendar(); renderTemplates(); updateStats();
        document.getElementById('post-output').value = ''; document.getElementById('post-output').placeholder = '✨ Здесь появится готовый пост после генерации...';
        showNotification('🗑️ Все данные удалены', 'info');
    }
}

export function openHashtagsModal() {
    const categories = {
        '🔥 Популярные': ['#socialmedia','#contentcreator','#viral','#trending','#explore','#fyp','#рекомендации'],
        '💼 Бизнес': ['#business','#entrepreneur','#marketing','#success','#growth','#бизнес','#маркетинг'],
        '📸 Instagram': ['#instagram','#instagood','#reels','#explorepage','#instadaily','#instagramtips'],
        '✈️ Telegram': ['#telegram','#tgchannel','#telegramchannel','#tgbot','#telegrammarketing','#телеграм'],
        '📌 Pinterest': ['#pinterest','#pinterestmarketing','#pinspiration','#pintereststrategy','#pinteresttips','#пинтерест'],
        '📝 Блогинг': ['#blogger','#blogging','#influencer','#contentmarketing','#digitalcreator','#блогер']
    };
    let html = `<div class="hashtags-modal"><div class="modal-header"><div class="modal-title">🏷️ Добавить хэштеги</div><button class="modal-close" onclick="window.closeModal()">✕</button></div><div class="modal-body"><div class="hashtags-categories">`;
    for (const [cat, tags] of Object.entries(categories)) {
        html += `<div class="hashtag-category"><div class="category-title">${cat}</div><div class="category-tags">${tags.map(t => `<button class="hashtag-btn" onclick="window.addHashtagToEditor('${t}')">${t}</button>`).join('')}</div></div>`;
    }
    html += `</div><div class="custom-hashtag"><input type="text" id="custom-hashtag-input" class="form-input" placeholder="Свой хэштег..." /><button class="btn btn--primary" onclick="window.addCustomHashtag()">➕ Добавить</button></div></div><div class="modal-footer"><button class="btn btn--secondary" onclick="window.insertPopularHashtags()">✨ Вставить популярные</button><button class="btn btn--ghost" onclick="window.closeModal()">Закрыть</button></div></div>`;
    openModal(html);
}

export function addHashtagToEditor(tag) {
    const postOutput = document.getElementById('post-output');
    postOutput.value = postOutput.value + ' ' + tag;
    autoResize(postOutput);
    if (currentIdeaId && !window.isEditing) { const idea = appState.ideas.find(i => i.id === currentIdeaId); if (idea) { idea.postText = postOutput.value; saveState(); } }
    showNotification(`➕ Добавлен ${tag}`, 'success');
}

export function addCustomHashtag() {
    const input = document.getElementById('custom-hashtag-input');
    let tag = input?.value.trim();
    if (!tag) { showNotification('Введите хэштег', 'warning'); return; }
    if (!tag.startsWith('#')) tag = '#' + tag;
    addHashtagToEditor(tag);
    if (input) input.value = '';
}

export function insertPopularHashtags() {
    const popular = ['#contentcreator','#socialmedia','#viral','#trending','#fyp'];
    popular.forEach(tag => addHashtagToEditor(tag));
    closeModal();
}