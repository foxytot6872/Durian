import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

createChat({
	webhookUrl: 'https://mydurian.app.n8n.cloud/webhook/9b5b2e7b-4454-48a7-b0f5-fcde9d59f68d/chat',

	target: '#n8n-chat',
	mode: 'window',

	chatInputKey: 'chatInput',
	chatSessionKey: 'sessionId',
	loadPreviousSession: true,

	showWelcomeScreen: true,

	initialMessages: [
		'Hi! Iโ€m Durian Expert Bot ๐ฑ',
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
