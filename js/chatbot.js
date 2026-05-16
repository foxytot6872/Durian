import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

const CHAT_TARGET_ID = 'n8n-chat';
const WEBHOOK_URL = 'https://mydurian.app.n8n.cloud/webhook/9b5b2e7b-4454-48a7-b0f5-fcde9d59f68d/chat';

function ensureChatTarget() {
    let target = document.getElementById(CHAT_TARGET_ID);
    if (!target) {
        target = document.createElement('div');
        target.id = CHAT_TARGET_ID;
        document.body.appendChild(target);
    }
    return target;
}

function initChatbot() {
    ensureChatTarget();

    try {
        createChat({
            webhookUrl: WEBHOOK_URL,

            target: `#${CHAT_TARGET_ID}`,
            mode: 'window',

            chatInputKey: 'chatInput',
            chatSessionKey: 'sessionId',
            loadPreviousSession: true,

            showWelcomeScreen: true,

            initialMessages: [
                'Hi! I’m Durian Expert Bot 🌱',
                'Ask me about durian farming.'
            ],

            i18n: {
                en: {
                    title: 'Durian Expert',
                    subtitle: 'Your farming assistant',
                    inputPlaceholder: 'Ask something...',
                },
            },
        });
    } catch (error) {
        console.error('Failed to initialize n8n chat widget:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}
