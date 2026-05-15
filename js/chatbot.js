// Chatbot Widget Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotApiCandidates = getChatbotApiCandidates();

    // Track chat window state
    let isOpen = false;
    const conversationHistory = [];
    const maxHistoryMessages = 12;

    function getChatbotApiCandidates() {
        const configuredUrl = (window.CHATBOT_API_URL || '').trim();
        if (configuredUrl) {
            return [configuredUrl];
        }

        const candidates = [];

        // Prefer same-origin proxy path in hosted deployments.
        if (window.location && /^https?:$/i.test(window.location.protocol)) {
            candidates.push('/api/chat');
        }

        // Keep localhost fallback for local development.
        candidates.push('http://localhost:8000/api/chat');
        return candidates;
    }

    async function postToChatbotApi(message, controller) {
        let lastError = null;

        for (let i = 0; i < chatbotApiCandidates.length; i += 1) {
            const apiUrl = chatbotApiCandidates[i];

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message,
                        history: conversationHistory
                    }),
                    signal: controller.signal
                });

                if (!response.ok) {
                    const shouldTryNextUrl = i < chatbotApiCandidates.length - 1 && (response.status === 404 || response.status === 502 || response.status === 503);
                    if (shouldTryNextUrl) {
                        continue;
                    }

                    let errorMessage = `HTTP ${response.status}`;

                    try {
                        const errorData = await response.json();
                        if (errorData.error && errorData.details && errorData.details !== errorData.error) {
                            errorMessage = `${errorData.error} ${errorData.details}`;
                        } else {
                            errorMessage = errorData.error || errorData.details || errorMessage;
                        }
                    } catch (_) {
                        const errorText = await response.text();
                        if (errorText) {
                            errorMessage = errorText;
                        }
                    }

                    throw new Error(errorMessage);
                }

                return response;
            } catch (error) {
                const canRetry = i < chatbotApiCandidates.length - 1;
                const isAbort = error && error.name === 'AbortError';
                const isNetworkFailure = error && /failed to fetch|networkerror/i.test(String(error.message || ''));

                if (isAbort) {
                    throw error;
                }

                if (!canRetry || !isNetworkFailure) {
                    throw error;
                }

                lastError = error;
            }
        }

        throw lastError || new Error('Unable to reach chatbot API endpoint.');
    }

    /**
     * Toggle the chatbot window open/close
     */
    function toggleChatbot() {
        isOpen = !isOpen;
        
        if (isOpen) {
            chatbotWindow.classList.add('active');
            chatbotButton.classList.add('hidden');
            chatbotInput.focus();
        } else {
            chatbotWindow.classList.remove('active');
            chatbotButton.classList.remove('hidden');
        }
    }

    /**
     * Close the chatbot window
     */
    function closeChatbot() {
        isOpen = false;
        chatbotWindow.classList.remove('active');
        chatbotButton.classList.remove('hidden');
    }

    /**
     * Add a message to the chat
     * @param {string} message - The message text
     * @param {string} sender - 'user' or 'bot'
     */
    function addMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
        
        messageDiv.appendChild(contentDiv);
        chatbotMessages.appendChild(messageDiv);
        
        // Auto-scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function pushHistory(role, content) {
        conversationHistory.push({ role, content });

        if (conversationHistory.length > maxHistoryMessages) {
            conversationHistory.splice(0, conversationHistory.length - maxHistoryMessages);
        }
    }

    function showTypingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message bot-message';
        messageDiv.dataset.typing = 'true';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '<p>Thinking...</p>';

        messageDiv.appendChild(contentDiv);
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

        return messageDiv;
    }

    function updateTypingMessage(typingMessage, message) {
        if (!typingMessage) {
            addMessage(message, 'bot');
            return;
        }

        const contentDiv = typingMessage.querySelector('.message-content');
        if (contentDiv) {
            contentDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
        }

        typingMessage.dataset.typing = 'false';
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    async function sendMessageToGpt(message) {
        const typingMessage = showTypingMessage();
        let timeoutId;

        try {
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await postToChatbotApi(message, controller);

            clearTimeout(timeoutId);

            const data = await response.json();
            const reply = data.reply || 'I could not generate a reply right now.';

            updateTypingMessage(typingMessage, reply);
            pushHistory('assistant', reply);
        } catch (error) {
            const errorText = String((error && error.message) || '');
            const fallback = /failed to fetch|networkerror/i.test(errorText)
                ? 'Cannot reach chatbot API. Start chatbot_api.py for local use, or configure /api/chat on your server.'
                : errorText || 'The GPT backend is not reachable right now. Start chatbot_api.py and try again.';
            updateTypingMessage(typingMessage, fallback);
            pushHistory('assistant', fallback);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Handle sending a message
     */
    function handleSendMessage() {
        const message = chatbotInput.value.trim();
        
        if (message === '') return;
        
        // Add user message to chat
        addMessage(message, 'user');
        pushHistory('user', message);
        
        // Clear input
        chatbotInput.value = '';

        sendMessageToGpt(message);
    }

    /**
     * Handle Enter key in input field
     */
    chatbotInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    // Event listeners
    chatbotButton.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', closeChatbot);
    chatbotSend.addEventListener('click', handleSendMessage);

    // Optional: Close chatbot when clicking outside (for better UX on small screens)
    document.addEventListener('click', function(event) {
        const chatbotWidget = document.getElementById('chatbotWidget');
        if (!chatbotWidget.contains(event.target) && isOpen) {
            // Only close if clicking outside the entire widget
            if (!event.target.closest('.chatbot-widget')) {
                closeChatbot();
            }
        }
    });
});
