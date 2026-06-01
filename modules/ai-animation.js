// modules/ai-animation.js
// Анимации для процесса генерации AI

class AIGeneratorAnimation {
    constructor() {
        this.statusDiv = null;
        this.interval = null;
        this.stepInterval = null;
        this.isError = false;
        
        // Слушаем события смены модели
        window.addEventListener('modelChange', (e) => {
            this.updateModelStatus(e.detail);
        });
    }

    start() {
        const container = document.getElementById('post-output');
        if (!container) return;

        this.isError = false;
        this.remove();

        container.classList.add('generating');

        this.statusDiv = document.createElement('div');
        this.statusDiv.className = 'ai-status-bar';
        this.statusDiv.innerHTML = `
            <div class="ai-spinner"></div>
            <div class="ai-status-text">
                🤖 AI генерирует пост <span class="ai-dots"></span>
            </div>
            <div class="ai-steps">
                <span class="ai-step" data-step="1">🧠 Анализ</span>
                <span class="ai-step" data-step="2">✍️ Текст</span>
                <span class="ai-step" data-step="3">✨ Эмодзи</span>
                <span class="ai-step" data-step="4">🔖 Хэштеги</span>
            </div>
        `;

        container.parentNode.insertBefore(this.statusDiv, container);

        const steps = this.statusDiv.querySelectorAll('.ai-step');
        let stepIndex = 0;

        this.stepInterval = setInterval(() => {
            if (stepIndex < steps.length && !this.isError) {
                steps[stepIndex].classList.add('active');
                stepIndex++;
            }
        }, 1200);

        const texts = [
            'Анализирую тему и аудиторию',
            'Пишу увлекательный текст',
            'Добавляю эмоции и эмодзи',
            'Формирую хэштеги'
        ];
        let textIndex = 0;
        
        this.interval = setInterval(() => {
            const textEl = this.statusDiv?.querySelector('.ai-status-text');
            if (textEl && textIndex < texts.length && !this.isError) {
                textEl.innerHTML = `🤖 ${texts[textIndex]} <span class="ai-dots"></span>`;
                textIndex++;
            }
        }, 1800);
    }

    // Обновляем статус при смене модели
    updateModelStatus({ modelName, attempt, total }) {
        if (!this.statusDiv || this.isError) return;
        
        const textEl = this.statusDiv.querySelector('.ai-status-text');
        if (textEl) {
            textEl.innerHTML = `🔄 Пробуем ${modelName} (${attempt}/${total}) <span class="ai-dots"></span>`;
        }
    }

    finish() {
        setTimeout(() => {
            this.remove();
            
            const container = document.getElementById('post-output');
            if (container) {
                container.classList.remove('generating');
                container.classList.add('generated');
                setTimeout(() => {
                    container.classList.remove('generated');
                }, 500);
            }
        }, 500);
    }

    // Показываем ошибку с предложениями
    showError(message, suggestions) {
        this.isError = true;
        this.remove();
        
        const container = document.getElementById('post-output');
        if (container) {
            container.classList.remove('generating');
            
            // Показываем красивое сообщение об ошибке
            const errorDiv = document.createElement('div');
            errorDiv.className = 'ai-error-message';
            errorDiv.innerHTML = `
                <div class="ai-error-icon">😴</div>
                <div class="ai-error-text">${message}</div>
                <div class="ai-error-suggestions">
                    ${suggestions.map(s => `<div class="ai-suggestion">${s}</div>`).join('')}
                </div>
                <button class="ai-error-btn" onclick="location.reload()">🔄 Обновить страницу</button>
            `;
            
            container.parentNode.insertBefore(errorDiv, container);
            
            setTimeout(() => {
                errorDiv.remove();
            }, 8000);
        }
    }

    stop() {
        this.remove();
        
        const container = document.getElementById('post-output');
        if (container) {
            container.classList.remove('generating');
        }
    }

    remove() {
        if (this.interval) clearInterval(this.interval);
        if (this.stepInterval) clearInterval(this.stepInterval);
        if (this.statusDiv) this.statusDiv.remove();
        this.statusDiv = null;
    }
}

export const aiAnimation = new AIGeneratorAnimation();