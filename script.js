// script.js - главный файл, объединяет модули
import { appState, setAppState, loadState, saveState, autoResize, formatISODate, setCurrentIdeaId } from './modules/core.js';
import { showNotification } from './modules/dialogs.js';
import { renderIdeas } from './modules/ideas.js';
import { renderTemplates } from './modules/templates.js';
import { renderCalendar, prevMonth, nextMonth, goToToday, addToCalendar, markAsPublished, markAsDraft } from './modules/calendar.js';
import { updateStats } from './modules/stats.js';
import { setActivePage } from './modules/navigation.js';
import { 
    saveCurrentIdea, copyPost, editPost, likeCurrentPost, regeneratePost, 
    addEmptyIdea, openAutoGenerateModal, generateAutoIdeas, exportToExcel, 
    exportToJSON, clearAllData, openHashtagsModal, addHashtagToEditor, 
    addCustomHashtag, insertPopularHashtags 
} from './modules/handlers.js';
import { generatePostForIdea } from './modules/ai.js';
import { addIdea } from './modules/ideas.js';

// Настраиваем callback после сохранения (переопределяем saveState из core.js)
const originalSaveState = saveState;
window.saveState = function() {
    originalSaveState();
    updateStats();
    renderIdeas();
    renderCalendar();
    renderTemplates();
};
// Подменяем saveState в core.js через глобальный вызов
window._afterSave = () => {
    updateStats();
    renderIdeas();
    renderCalendar();
    renderTemplates();
};

// Инициализация
function init() {
    // Загружаем состояние
    const loaded = loadState();
    setAppState(loaded);
    
    // Привязываем глобальные обработчики для вызова из onclick
    window.generateAutoIdeas = generateAutoIdeas;
    window.addHashtagToEditor = addHashtagToEditor;
    window.addCustomHashtag = addCustomHashtag;
    window.insertPopularHashtags = insertPopularHashtags;
    window.markAsPublished = markAsPublished;
    window.markAsDraft = markAsDraft;
    window.addToCalendar = addToCalendar;
    
    // Навигация
    document.querySelectorAll('.navlink[data-page]').forEach(btn => btn.addEventListener('click', () => setActivePage(btn.getAttribute('data-page'))));
    
    // Кнопки
    document.getElementById('btn-generate-auto')?.addEventListener('click', openAutoGenerateModal);
    document.getElementById('btn-add-hashtags')?.addEventListener('click', openHashtagsModal);
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
    document.getElementById('btn-generate-excel')?.addEventListener('click', exportToExcel);
    document.getElementById('btn-export-json')?.addEventListener('click', exportToJSON);
    document.getElementById('btn-clear')?.addEventListener('click', clearAllData);
    
    // Календарь навигация
    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');
    const todayBtn = document.getElementById('cal-today');
    if (prevBtn) prevBtn.addEventListener('click', prevMonth);
    if (nextBtn) nextBtn.addEventListener('click', nextMonth);
    if (todayBtn) todayBtn.addEventListener('click', goToToday);
    
    // Дата по умолчанию
    if (document.getElementById('plan-date') && !document.getElementById('plan-date').value) {
        document.getElementById('plan-date').value = formatISODate(new Date());
    }
    
    // Auto-resize
    document.querySelectorAll('.auto-resize').forEach(autoResize);
    const postOutput = document.getElementById('post-output');
    if (postOutput) postOutput.addEventListener('input', () => autoResize(postOutput));
    

    // В конце функции init() добавь:

// Фикс для мобильных - принудительно включаем скролл
if (window.innerWidth <= 768) {
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    
    // Убираем overflow hidden у всех основных контейнеров
    const containers = document.querySelectorAll('.main, .page, .app-shell, .h-screen, .overflow-hidden');
    containers.forEach(el => {
        el.style.overflow = 'visible';
        el.style.height = 'auto';
        el.style.minHeight = 'auto';
    });
}

// Обработчик изменения размера окна
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
    } else {
        document.body.style.overflow = '';
        document.body.style.height = '';
    }
});

    // Первоначальный рендер
    renderIdeas();
    renderCalendar();
    renderTemplates();
    updateStats();
    setActivePage('planner');
    
    showNotification('🎉 Glitchless Pin готов к работе!', 'success');
}

// Глобальная функция для принудительного закрытия всех модалок
window.forceCloseModal = () => {
    const modalRoot = document.getElementById('modal-root');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    
    if (modalRoot) modalRoot.classList.add('hidden');
    if (modalBackdrop) modalBackdrop.classList.remove('show');
    if (modalContent) modalContent.innerHTML = '';
    
    // Убираем классы
    if (modalContent) modalContent.classList.remove('dialog-modal');
    
    // Очищаем resolver
    window._dialogResolve = null;
};

// Запуск
document.addEventListener('DOMContentLoaded', init);