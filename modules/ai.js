// modules/ai.js
import { appState, setCurrentIdeaId, saveState, autoResize, formatISODate } from './core.js';
import { showNotification } from './dialogs.js';

function cleanAndFormatText(text) {
    // Убираем Markdown звёздочки (**текст** → текст, *текст* → текст)
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
    cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
    cleaned = cleaned.replace(/___(.*?)___/g, '$1');
    cleaned = cleaned.replace(/__(.*?)__/g, '$1');
    cleaned = cleaned.replace(/`(.*?)`/g, '$1');

    // Убираем лишние переносы/пробелы
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.replace(/ +/g, ' ');

    return cleaned.trim();
}

function countChars(str) {
    return (str || '').length;
}

function getPlatformRules(platform) {
    const rules = {
        Pinterest: {
            targetMin: 125,
            targetMax: 150,
            firstPriorityChars: 40,
            structureHint: '1–2 предложения, без хэштегов (используй ключевые слова)',
            hashtagsMode: 'forbidden',
        },
        Instagram: {
            targetMin: 125,
            targetMax: 150,
            firstPriorityChars: 40,
            structureHint: '1–3 предложения + в конце 5–10 хэштегов',
            hashtagsMode: 'required',
            hashtagsMin: 5,
            hashtagsMax: 10,
        },
        Telegram: {
            targetMin: 1200,
            targetMax: 2000,
            firstPriorityChars: 120,
            structureHint: '2–6 абзацев, первые ~120 символов — хук для пуш-уведомления',
            hashtagsMode: 'optional',
        },
    };

    return rules[platform] || {
        targetMin: 500,
        targetMax: 900,
        firstPriorityChars: 80,
        structureHint: 'понятный пост с приоритетом на начало',
        hashtagsMode: 'optional',
    };
}

function normalizeNewlines(text) {
    return (text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function hasHashtags(text) {
    return /(^|\s)#\S+/m.test(text || '');
}

function stripHashtags(text) {
    // удаляем токены начиная с # до пробела/переноса
    return (text || '').replace(/(^|\s)(#[^\s\n]+)(?=\s|\n|$)/g, (m, p1) => (p1 || ''));
}

function stripExtraHashtagsIfAny(text, maxHashtags) {
    const parts = (text || '').split(/\s+/);
    const tags = [];
    const other = [];

    for (const p of parts) {
        if (p.startsWith('#')) tags.push(p);
        else if (p) other.push(p);
    }

    if (tags.length <= maxHashtags) return text;

    const trimmedTags = tags.slice(0, maxHashtags);
    return other.join(' ').trim() + '\n' + trimmedTags.join(' ');
}

function softTrimToRange(post, platform) {
    const rules = getPlatformRules(platform);

    let cleaned = normalizeNewlines(post);

    // Pinterest: хэштеги нельзя
    if (platform === 'Pinterest' && hasHashtags(cleaned)) {
        cleaned = stripHashtags(cleaned);
    }

    const len = countChars(cleaned);
    if (len >= rules.targetMin && len <= rules.targetMax) return cleaned;

    // Если сильно длиннее max — делаем мягкую подрезку по границе предложения
    if (len > rules.targetMax) {
        const truncated = cleaned.substring(0, rules.targetMax);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastNewLine = truncated.lastIndexOf('\n');
        const cutPoint = Math.max(lastPeriod, lastNewLine, truncated.length - 60);
        cleaned = truncated.substring(0, cutPoint).trim();
        if (cleaned.length < rules.targetMin) cleaned = cleaned + '…';
    }

    // Instagram: ограничим хэштеги сверху
    if (platform === 'Instagram' && rules.hashtagsMode === 'required') {
        cleaned = stripExtraHashtagsIfAny(cleaned, rules.hashtagsMax);
    }

    return cleaned;
}

async function ensurePlatformRequirements({ post, topic, direction, platform, details }) {
    const rules = getPlatformRules(platform);

    let cleaned = cleanAndFormatText(post);
    cleaned = softTrimToRange(cleaned, platform);

    const len = countChars(cleaned);
    const within = len >= rules.targetMin && len <= rules.targetMax;

    // 1 повторная генерация, если вне диапазона
    if (!within) {
        const systemPrompt = `Ты — профессиональный копирайтер.
Сгенерируй готовый пост для платформы: ${platform}.
Тема: "${topic}"
Направление: ${direction}
${details ? `Дополнительно: ${details}` : ''}

Требования строго:
- Длина поста: от ${rules.targetMin} до ${rules.targetMax} знаков (включая пробелы), без обрезания.
- Первые ${rules.firstPriorityChars} знаков должны быть максимально цепляющими.
- Структура: ${rules.structureHint}.

Хэштеги:
${platform === 'Pinterest' ? '- Pinterest: хэштеги запрещены. Используй ключевые слова.' : ''}
${platform === 'Instagram' ? `- Instagram: добавь ${rules.hashtagsMin}–${rules.hashtagsMax} хэштегов, все в конце и каждый начинается с #.` : ''}
${platform === 'Telegram' ? '- Telegram: хэштеги не критичны, главное — абзацы.' : ''}

Верни ТОЛЬКО текст поста без кавычек и без Markdown-разметки.`;

        const firstChunk = cleaned.substring(0, rules.firstPriorityChars);

        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-lite-001',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: `Черновик плох по длине/формату. Перегенерируй строго под диапазон ${rules.targetMin}-${rules.targetMax}.
Черновик: "${cleaned}"
Первые ${rules.firstPriorityChars} знаков: "${firstChunk}"`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        let regenerated = data.choices?.[0]?.message?.content || '';
        regenerated = regenerated.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();

        cleaned = normalizeNewlines(regenerated);
        cleaned = cleanAndFormatText(cleaned);
        cleaned = softTrimToRange(cleaned, platform);

        // финальная защита
        if (platform === 'Pinterest' && hasHashtags(cleaned)) cleaned = stripHashtags(cleaned);
        if (platform === 'Instagram' && rules.hashtagsMode === 'required') {
            cleaned = stripExtraHashtagsIfAny(cleaned, rules.hashtagsMax);
        }
    }

    return cleaned;
}

// ============ AI ГЕНЕРАЦИЯ (через локальный прокси-сервер) ============
async function generateAIPost(topic, direction, platform, details = '') {
    const rules = getPlatformRules(platform);

    const systemPrompt = `Ты профессиональный копирайтер.
Напиши ГОТОВЫЙ ПОСТ для публикации.

Тема: "${topic}"
Платформа: ${platform}
Направление: ${direction}
${details ? `Дополнительно: ${details}` : ''}

Точные требования:
- Длина поста: от ${rules.targetMin} до ${rules.targetMax} знаков (включая пробелы), без обрезания.
- Приоритет первых ${rules.firstPriorityChars} символов: это должно быть самым сильным крючком.
- Структура: ${rules.structureHint}.

Хэштеги:
${platform === 'Pinterest' ? '- Pinterest: хэштеги нельзя. Используй ключевые слова.' : ''}
${platform === 'Instagram' ? `- Instagram: хэштеги обязательны, ${rules.hashtagsMin}–${rules.hashtagsMax} штук, в конце.` : ''}
${platform === 'Telegram' ? '- Telegram: хэштеги не обязательны.' : ''}

Верни ТОЛЬКО текст поста без кавычек и без Markdown-разметки.`;

    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-lite-001',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Напиши пост на тему: "${topic}"` },
                ],
                temperature: 0.8,
                max_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        let post = data.choices?.[0]?.message?.content || '';
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

        const rawPost = await generateAIPost(idea.topic, idea.direction, platform, idea.details);

        // Подбор точной длины/условий по платформе
        const post = await ensurePlatformRequirements({
            post: rawPost,
            topic: idea.topic,
            direction: idea.direction,
            platform,
            details: idea.details,
        });

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
            likeBtn.innerHTML = isLiked
                ? '<i class="fa-solid fa-heart"></i> В шаблонах ✅'
                : '<i class="fa-regular fa-heart"></i> Сохранить в шаблоны';
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

