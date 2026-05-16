// modules/navigation.js
import { renderCalendar } from './calendar.js';
import { renderTemplates } from './templates.js';
import { updateStats } from './stats.js';

export function setActivePage(page) {
    ['planner','templates','calendar','statistics','account'].forEach(p => { const el = document.getElementById(`page-${p}`); if (el) el.classList.toggle('hidden', p !== page); });
    const titles = { planner: { title: '🤖 AI Генератор постов', subtitle: 'Создайте идею → Получите готовый пост → Сохраняйте лучшие' }, templates: { title: '⭐ Избранные шаблоны', subtitle: 'Ваши лучшие посты, отмеченные сердечком' }, calendar: { title: '📅 Контент-календарь', subtitle: 'Планируйте публикации и отмечайте выполненные' }, statistics: { title: '📊 Статистика', subtitle: 'Анализируйте ваш контент' }, account: { title: '👤 Аккаунт', subtitle: 'Настройки и информация' } };
    const title = titles[page];
    if (title) { document.getElementById('page-title').textContent = title.title; document.getElementById('page-subtitle').textContent = title.subtitle; }
    history.replaceState({}, '', '#' + page);
    if (page === 'calendar') renderCalendar();
    if (page === 'templates') renderTemplates();
}