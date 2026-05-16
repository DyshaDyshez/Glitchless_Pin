// modules/dialogs.js
import { escapeHtml } from './core.js';

export function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    notification.style.cssText = `
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease forwards;
        z-index: 1000;
    `;
    notification.innerHTML = `${icons[type]} ${message}`;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export function openModal(html, isDialog = false) {
    const modalRoot = document.getElementById('modal-root');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = html;
    modalRoot.classList.remove('hidden');
    if (isDialog) modalContent.classList.add('dialog-modal');
    setTimeout(() => modalBackdrop.classList.add('show'), 10);
    const firstInput = modalContent.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

export function closeModal() {
    const modalRoot = document.getElementById('modal-root');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    modalBackdrop.classList.remove('show');
    setTimeout(() => {
        modalRoot.classList.add('hidden');
        modalContent.innerHTML = '';
        modalContent.classList.remove('dialog-modal');
    }, 200);
}

export function customConfirm(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
        const html = `
            <div class="custom-dialog custom-confirm">
                <div class="dialog-icon">❓</div>
                <div class="dialog-title">${escapeHtml(title)}</div>
                <div class="dialog-message">${escapeHtml(message)}</div>
                <div class="dialog-actions">
                    <button class="dialog-btn dialog-btn-secondary" onclick="window._dialogResolve(false)">Отмена</button>
                    <button class="dialog-btn dialog-btn-primary" onclick="window._dialogResolve(true)">Подтвердить</button>
                </div>
            </div>
        `;
        window._dialogResolve = resolve;
        openModal(html, true);
    });
}

export function customPrompt(message, defaultValue = '', title = 'Введите значение') {
    return new Promise((resolve) => {
        const html = `
            <div class="custom-dialog custom-prompt">
                <div class="dialog-icon">✏️</div>
                <div class="dialog-title">${escapeHtml(title)}</div>
                <div class="dialog-message">${escapeHtml(message)}</div>
                <div class="dialog-input-wrapper">
                    <input type="text" id="prompt-input" class="dialog-input" value="${escapeHtml(defaultValue)}" placeholder="Введите текст..." autofocus />
                </div>
                <div class="dialog-actions">
                    <button class="dialog-btn dialog-btn-secondary" onclick="window._dialogResolve(null)">Отмена</button>
                    <button class="dialog-btn dialog-btn-primary" onclick="window._dialogResolve(document.getElementById('prompt-input')?.value || '')">OK</button>
                </div>
            </div>
        `;
        window._dialogResolve = resolve;
        openModal(html, true);
    });
}

// Глобальные привязки для вызова из onclick
window.closeModal = closeModal;
window.customConfirm = customConfirm;
window.customPrompt = customPrompt;
window.showNotification = showNotification;