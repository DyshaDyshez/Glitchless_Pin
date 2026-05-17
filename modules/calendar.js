// modules/calendar.js
import { appState, formatISODate, escapeHtml, saveState, uid, currentIdeaId } from './core.js';
import { showNotification, customConfirm, openModal, closeModal } from './dialogs.js';
import { setActivePage } from './navigation.js';

let calCursor = new Date();
let dragSource = null;

export function renderCalendar() {
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
    
    // Экранируем текст для безопасного вставления в JS
    const safePostText = idea.postText || 'Текст не сгенерирован';
    const safeNotes = calendarItem.notes || '';
    
    const html = `
        <div class="post-modal" id="post-modal-container">
            <div class="modal-header">
                <div class="modal-title">
                    <span class="modal-icon">${DIR_ICONS[calendarItem.direction] || '📝'}</span>
                    <span id="modal-post-title">${escapeHtml(idea.topic || 'Без темы')}</span>
                </div>
                <button class="modal-close" onclick="window.closeModal()">✕</button>
            </div>
            
            <div class="modal-meta">
                <div class="meta-item">
                    <span class="meta-label">📅 Дата:</span>
                    <span class="meta-value">${calendarItem.date}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">📱 Платформа:</span>
                    <span class="meta-value">${TAG_ICONS[calendarItem.tagKey] || '📌'} ${calendarItem.tagKey}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">🎯 Направление:</span>
                    <span class="meta-value" style="color:${calendarItem.direction === 'Экспертность' ? '#3b82f6' : calendarItem.direction === 'Польза' ? '#22c55e' : '#ef4444'}">
                        ${DIR_ICONS[calendarItem.direction]} ${calendarItem.direction}
                    </span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">📌 Статус:</span>
                    <span class="status-badge ${isPublished ? 'published' : 'draft'}">
                        ${isPublished ? '✅ Опубликован' : '📝 Черновик'}
                    </span>
                </div>
            </div>
            
            <div class="modal-divider"></div>
            
            <div class="modal-section">
                <div class="section-title" style="display: flex; justify-content: space-between; align-items: center;">
                    <span>📝 Текст поста</span>
                    <button id="modal-edit-post-btn" class="btn-edit-inline">
                        <i class="fa-regular fa-pen"></i> Редактировать
                    </button>
                </div>
                <div id="modal-post-content" class="post-content" style="white-space: pre-wrap;">${escapeHtml(safePostText)}</div>
                <textarea id="modal-post-textarea" class="post-content-editable" style="display: none; width: 100%; min-height: 200px; padding: 12px; border-radius: 12px; border: 2px solid #6366f1; font-family: inherit; font-size: 14px; line-height: 1.5; resize: vertical;">${escapeHtml(safePostText)}</textarea>
            </div>
            
            ${calendarItem.notes ? `
            <div class="modal-section">
                <div class="section-title">📌 Заметки</div>
                <div class="notes-content">${escapeHtml(calendarItem.notes)}</div>
            </div>
            ` : ''}
            
            <div class="modal-divider"></div>
            
            <div class="modal-actions">
                <button class="btn btn--secondary" onclick="window.copyModalPostContent()">📋 Копировать текст</button>
                ${!isPublished ? 
                    `<button class="btn btn--success" onclick="window.markAsPublished('${calendarItem.id}')">✅ Отметить как опубликованный</button>` : 
                    `<button class="btn btn--warning" onclick="window.markAsDraft('${calendarItem.id}')">📝 Вернуть в черновики</button>`
                }
                <button class="btn btn--ghost" onclick="window.closeModal()">Закрыть</button>
            </div>
        </div>
    `;
    
    openModal(html);
    
    // Добавляем обработчики после открытия модалки
    setTimeout(() => {
        const editBtn = document.getElementById('modal-edit-post-btn');
        const contentDiv = document.getElementById('modal-post-content');
        const textarea = document.getElementById('modal-post-textarea');
        
        if (editBtn && contentDiv && textarea) {
            let isEditMode = false;
            
            editBtn.addEventListener('click', () => {
                if (!isEditMode) {
                    // Включаем режим редактирования
                    contentDiv.style.display = 'none';
                    textarea.style.display = 'block';
                    editBtn.innerHTML = '<i class="fa-regular fa-floppy-disk"></i> Сохранить';
                    editBtn.classList.add('btn-edit-active');
                    isEditMode = true;
                } else {
                    // Сохраняем изменения
                    const newText = textarea.value;
                    const ideaId = calendarItem.ideaId;
                    
                    // Находим идею и обновляем текст
                    const ideaToUpdate = appState.ideas.find(i => i.id === ideaId);
                    if (ideaToUpdate) {
                        ideaToUpdate.postText = newText;
                        saveState();
                        showNotification('✅ Пост обновлён!', 'success');
                        
                        // Обновляем отображение
                        contentDiv.textContent = newText;
                        contentDiv.style.whiteSpace = 'pre-wrap';
                        contentDiv.style.display = 'block';
                        textarea.style.display = 'none';
                        editBtn.innerHTML = '<i class="fa-regular fa-pen"></i> Редактировать';
                        editBtn.classList.remove('btn-edit-active');
                        isEditMode = false;
                    }
                }
            });
        }
    }, 50);
}

// Добавляем глобальную функцию для копирования текста из модалки
window.copyModalPostContent = () => {
    const textarea = document.getElementById('modal-post-textarea');
    const contentDiv = document.getElementById('modal-post-content');
    
    let textToCopy = '';
    if (textarea && textarea.style.display === 'block') {
        textToCopy = textarea.value;
    } else if (contentDiv) {
        textToCopy = contentDiv.innerText;
    }
    
    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showNotification('📋 Текст скопирован!', 'success');
        }).catch(() => {
            showNotification('❌ Не удалось скопировать', 'error');
        });
    }
};


export function markAsPublished(id) {
    const item = appState.calendar?.find(c => c.id === id);
    if (item) { 
        item.published = true; 
        item.publishedAt = new Date().toISOString(); 
        saveState(); 
        renderCalendar(); 
        closeModal(); // Закрываем модалку
        showNotification('✅ Пост отмечен как опубликованный!', 'success'); 
    }
}

export function markAsDraft(id) {
    const item = appState.calendar?.find(c => c.id === id);
    if (item) { 
        item.published = false; 
        delete item.publishedAt; 
        saveState(); 
        renderCalendar(); 
        closeModal(); // Закрываем модалку
        showNotification('📝 Пост возвращён в черновики', 'info'); 
    }
}

export function addToCalendar() {
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
    saveState(); renderCalendar(); showNotification('✅ Пост добавлен в календарь!', 'success');
    setActivePage('calendar');
}

export function prevMonth() { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); }
export function nextMonth() { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); }
export function goToToday() { calCursor = new Date(); renderCalendar(); }