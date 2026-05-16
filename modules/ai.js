// modules/ai.js
import { CONFIG, appState, setCurrentIdeaId, saveState, autoResize, formatISODate } from './core.js';
import { showNotification } from './dialogs.js';

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
    try {
        const response = await fetch(CONFIG.OPENROUTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.OPENROUTER_API_KEY}`, 'HTTP-Referer': window.location.href, 'X-Title': 'Glitchless Pin' },
            body: JSON.stringify({ model: 'google/gemini-2.0-flash-lite-001', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Напиши пост на тему: "${topic}"` }], temperature: 0.8, max_tokens: 1500 })
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        let post = data.choices[0].message.content;
        post = post.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
        return post;
    } catch (error) {
        console.error('AI Error:', error);
        throw new Error(`Ошибка генерации: ${error.message}`);
    }
}

export async function generatePostForIdea(ideaId, showInEditor = true) {
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
            setCurrentIdeaId(ideaId);
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