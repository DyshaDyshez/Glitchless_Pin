// modules/ai-models.js
// Умный перебор AI моделей при ошибках

// Список моделей (от самых быстрых/бесплатных к надёжным)
const MODELS = [
    { id: 'qwen/qwen3.6-plus-preview:free', name: 'Qwen 3.6', type: 'free' },
    { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4', type: 'free' },
    { id: 'microsoft/phi-4:free', name: 'Phi-4', type: 'free' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', type: 'paid' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini Flash', type: 'paid' },
    { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B', type: 'free' },
    { id: 'meta-llama/llama-3.2-3b-instruct', name: 'Llama 3.2', type: 'free' }
];

class AIModelManager {
    constructor() {
        this.currentModelIndex = 0;
        this.errors = [];
    }

    async generateWithRetry(systemPrompt, userPrompt, apiKey) {
        // Начинаем с первой модели
        this.currentModelIndex = 0;
        this.errors = [];
        
        for (let i = 0; i < MODELS.length; i++) {
            const model = MODELS[i];
            console.log(`🔄 Попытка ${i + 1}/${MODELS.length}: ${model.name} (${model.id})`);
            
            // Отправляем событие о смене модели (для анимации)
            this.dispatchModelChangeEvent(model.name, i + 1, MODELS.length);
            
            try {
                const response = await this.callModel(model.id, systemPrompt, userPrompt, apiKey);
                
                // Успех! Возвращаем результат
                console.log(`✅ Успешно! Модель: ${model.name}`);
                return {
                    success: true,
                    text: response,
                    model: model.name,
                    attempts: i + 1
                };
                
            } catch (error) {
                console.warn(`❌ Модель ${model.name} не сработала:`, error.message);
                this.errors.push({ model: model.name, error: error.message });
                
                // Небольшая задержка перед следующей попыткой
                await this.delay(1000);
            }
        }
        
        // Все модели не сработали
        return {
            success: false,
            errors: this.errors,
            message: 'Извините, нейросеть прилегла отдохнуть. Воспользуйтесь шаблонами ♥'
        };
    }
    
    async callModel(modelId, systemPrompt, userPrompt, apiKey) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Glitchless Pin'
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
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
        
        // Очистка от форматирования
        post = this.cleanPostText(post);
        
        return post;
    }
    
    cleanPostText(post) {
        return post
            .replace(/```\w*\n?/g, '')
            .replace(/```/g, '')
            .replace(/\*\*\*/g, '')
            .replace(/---/g, '')
            .replace(/___/g, '')
            .replace(/\*\*/g, '')
            .replace(/__/g, '')
            .replace(/\*(?!\s)/g, '')
            .replace(/_(?!\s)/g, '')
            .replace(/#{1,6}\s/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    
    dispatchModelChangeEvent(modelName, attempt, total) {
        const event = new CustomEvent('modelChange', {
            detail: { modelName, attempt, total }
        });
        window.dispatchEvent(event);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getSuggestions() {
        return [
            '💡 Попробуйте выбрать другую платформу',
            '💡 Упростите тему поста',
            '💡 Воспользуйтесь готовыми шаблонами',
            '💡 Проверьте подключение к интернету',
            '💡 Обновите страницу и попробуйте снова'
        ];
    }
}

export const aiManager = new AIModelManager();