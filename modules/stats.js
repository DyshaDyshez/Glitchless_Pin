// modules/stats.js
import { appState } from './core.js';

export function updateStats() {
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