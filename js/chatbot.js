// Chatbot Widget Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const chatbotButton = document.getElementById('chatbotButton');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const isLocalEnvironment = /^file:|^http:\/\/localhost|^http:\/\/127\.0\.0\.1/i.test(window.location.href);

    function normalizeCandidateUrl(url) {
        return (url || '').trim().replace(/\/$/, '');
    }

    function deriveFirebaseFunctionUrl() {
        const region = (window.CHATBOT_FUNCTION_REGION || 'us-central1').trim();
        const hostname = (window.location.hostname || '').toLowerCase();
        const firebaseHostMatch = hostname.match(/^([a-z0-9-]+)\.(web\.app|firebaseapp\.com)$/);

        if (!firebaseHostMatch) {
            return '';
        }

        const projectId = firebaseHostMatch[1];
        return `https://${region}-${projectId}.cloudfunctions.net/chatbot`;
    }

    function buildApiCandidates() {
        const configuredApiUrl = normalizeCandidateUrl(window.CHATBOT_API_URL);
        const configuredFunctionUrl = normalizeCandidateUrl(window.CHATBOT_FUNCTION_URL);
        const derivedFunctionUrl = normalizeCandidateUrl(deriveFirebaseFunctionUrl());
        const candidates = [];

        if (configuredApiUrl) {
            candidates.push(configuredApiUrl);
        }

        if (isLocalEnvironment) {
            candidates.push('http://localhost:8000/api/chat');
        } else {
            candidates.push('/api/chat');
        }

        if (configuredFunctionUrl) {
            candidates.push(configuredFunctionUrl);
        }

        if (derivedFunctionUrl) {
            candidates.push(derivedFunctionUrl);
        }

        return [...new Set(candidates.filter(Boolean))];
    }

    const chatbotApiCandidates = buildApiCandidates();

    // Track chat window state
    let isOpen = false;
    const conversationHistory = [];
    const maxHistoryMessages = 12;

    async function postToChatbotApi(message, controller) {
        if (chatbotApiCandidates.length === 0) {
            throw new Error('Set window.CHATBOT_API_URL or window.CHATBOT_FUNCTION_URL in index.html to your public chatbot endpoint.');
        }

        let lastError;

        for (const apiUrl of chatbotApiCandidates) {
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
                    let errorMessage = `HTTP ${response.status}`;

                    const rawBody = await response.text();
                    if (rawBody) {
                        try {
                            const errorData = JSON.parse(rawBody);
                            if (errorData.error && errorData.details && errorData.details !== errorData.error) {
                                errorMessage = `${errorData.error} ${errorData.details}`;
                            } else {
                                errorMessage = errorData.error || errorData.details || rawBody;
                            }
                        } catch (_) {
                            errorMessage = rawBody;
                        }
                    }

                    const httpError = new Error(`${errorMessage} (${apiUrl})`);
                    httpError.isHttpError = true;
                    throw httpError;
                }

                return response;
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    throw new Error('Chatbot request timed out. Please try again.');
                }

                // If the endpoint responded with an HTTP error, surface it directly.
                // Fallback endpoints are only for network reachability failures.
                if (error && error.isHttpError) {
                    throw error;
                }

                lastError = error;
            }
        }

        if (lastError && lastError.message) {
            throw lastError;
        }

        throw new Error('The chatbot API is not reachable. Check your endpoint configuration.');
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
            const fallback = error && error.message
                ? error.message
                : 'The chatbot API is not reachable. Set CHATBOT_API_URL or CHATBOT_FUNCTION_URL in index.html.';
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
