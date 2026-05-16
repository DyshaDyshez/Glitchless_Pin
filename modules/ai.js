// modules/ai.js
import { CONFIG, appState, setCurrentIdeaId, saveState, autoResize, formatISODate } from './core.js';
import { showNotification } from './dialogs.js';

function cleanAndFormatText(text) {
    // Убираем Markdown звёздочки (**текст** → текст, *текст* → текст)
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    cleaned = cleaned.replace(/___(.*?)___/g, '$1');
    cleaned = cleaned.replace(/__(.*?)__/g, '$1');
    cleaned = cleaned.replace(/`(.*?)`/g, '$1');
    
    // Убираем лишние символы
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/ +/g, ' ');
    
    return cleaned.trim();
}

function truncateForPlatform(post, platform) {
    let maxLength = 2000;
    
    if (platform === 'Pinterest') {
        maxLength = 800;
    } else if (platform === 'Instagram') {
        maxLength = 2200;
    } else if (platform === 'Telegram') {
        maxLength = 4096;
    }
    
    if (post.length > maxLength) {
        const truncated = post.substring(0, maxLength - 50);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastNewLine = truncated.lastIndexOf('\n');
        const cutPoint = Math.max(lastPeriod, lastNewLine, truncated.length - 20);
        post = truncated.substring(0, cutPoint) + '\n\n... (продолжение в комментариях)';
        showNotification(`⚠️ Пост сокращён до ${maxLength} символов для ${platform}`, 'warning');
    }
    
    return post;
}

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
5. В конце добавь 3-5 хэштегов
6. НЕ используй Markdown звёздочки (** и *), пиши обычным текстом
7. Соблюдай ограничение по символам: для Pinterest - 800, Instagram - 2200, Telegram - 4096`;
    
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
        let post = await generateAIPost(idea.topic, idea.direction, platform, idea.details);
        
        // Очищаем от звёздочек и форматируем
        post = cleanAndFormatText(post);
        // Ограничиваем по длине
        post = truncateForPlatform(post, platform);
        
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
        showNotification(`✨ Пост сгенерирован для ${platform}!`, 'success');
    } catch (error) {
        console.error(error);
        if (btn) {
            btn.innerHTML = '❌ Ошибка';
            setTimeout(() => { if (btn) { btn.innerHTML = originalHTML; btn.disabled = false; } }, 3000);
        }
        showNotification(error.message, 'error');
    }
}