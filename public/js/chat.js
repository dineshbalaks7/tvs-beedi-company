/**
 * TVS Beedi Company - Tamil & Tanglish Conversational Assistant Client
 * Handles natural language questions, voice recognition (ta-IN), and confirmation cards.
 */

const CHAT_SESSION_ID = 'tvs_beedi_' + Date.now();
let speechRecognition = null;
let isRecording = false;

// Initialize Web Speech API for Tamil voice input
function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    console.warn('Web Speech Recognition not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRec();
  recognition.lang = (currentLanguage === 'en') ? 'en-IN' : 'ta-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecording = true;
    const micBtn = document.getElementById('chatMicBtn');
    if (micBtn) micBtn.classList.add('recording');
    showToast((currentLanguage === 'en') ? 'Listening... Speak now' : 'கேட்கிறது... தமிழில் பேசவும்');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const inputField = document.getElementById('chatInputField');
    if (inputField) {
      inputField.value = transcript;
      handleSendChat();
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isRecording = false;
    const micBtn = document.getElementById('chatMicBtn');
    if (micBtn) micBtn.classList.remove('recording');
  };

  recognition.onend = () => {
    isRecording = false;
    const micBtn = document.getElementById('chatMicBtn');
    if (micBtn) micBtn.classList.remove('recording');
  };

  return recognition;
}

function toggleVoiceInput() {
  if (!speechRecognition) {
    speechRecognition = initSpeechRecognition();
  }

  if (!speechRecognition) {
    showToast(getTranslation('errorOccurred'), 'error');
    return;
  }

  if (isRecording) {
    speechRecognition.stop();
  } else {
    // dynamically set language based on app state
    speechRecognition.lang = (currentLanguage === 'en') ? 'en-IN' : 'ta-IN';
    speechRecognition.start();
  }
}

// Handle chat input submission
async function handleSendChat() {
  const input = document.getElementById('chatInputField');
  const message = input.value.trim();
  if (!message) return;

  // Append user message
  appendChatMessage(message, 'user');
  input.value = '';

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sessionId: CHAT_SESSION_ID
      })
    });

    removeTypingIndicator(typingId);
    const data = await res.json();

    if (data.reply) {
      appendChatMessage(data.reply, 'assistant', data);
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendChatMessage((currentLanguage === 'en') ? 'Network error. Please try again.' : 'இணைப்புப் பிழை. மீண்டும் முயற்சிக்கவும்.', 'assistant');
  }
}

function handleChatKeyPress(event) {
  if (event.key === 'Enter') {
    handleSendChat();
  }
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('chatInputField');
  if (input) {
    input.value = promptText;
    handleSendChat();
  }
}

// Render formatted text
function formatMessageText(text) {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  return html;
}

// Append message bubble
function appendChatMessage(text, sender, meta = null) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerHTML = formatMessageText(text);

  // If action requires confirmation, append interactive action card
  if (meta && meta.actionRequired && meta.actionPayload) {
    const confirmCard = document.createElement('div');
    confirmCard.className = 'chat-confirm-card';
    confirmCard.innerHTML = `
      <div style="font-weight: 700; color: var(--accent-gold); margin-bottom: 6px;">
        ${meta.confirmationPrompt || 'இதை சேமிக்கவா?'}
      </div>
      <div class="confirm-actions-row">
        <button class="btn-confirm-yes" onclick="submitChatConfirmation(true, this)">
          ${meta.confirmButtonText || 'ஆம், சேமிக்கவும்'}
        </button>
        <button class="btn-confirm-no" onclick="submitChatConfirmation(false, this)">
          ${meta.cancelButtonText || 'இல்லை'}
        </button>
      </div>
    `;
    bubble.appendChild(confirmCard);
  }

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Submit action confirmation
async function submitChatConfirmation(isConfirmed, buttonEl) {
  const parentCard = buttonEl.closest('.chat-confirm-card');
  if (parentCard) {
    parentCard.innerHTML = `<div style="font-size: 13px; color: var(--text-muted); text-align: center;">${isConfirmed ? 'சேமிக்கப்படுகிறது...' : 'ரத்து செய்யப்படுகிறது...'}</div>`;
  }

  const typingId = showTypingIndicator();

  try {
    const res = await fetch('/api/chat/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: CHAT_SESSION_ID,
        confirm: isConfirmed
      })
    });

    removeTypingIndicator(typingId);
    const data = await res.json();

    if (data.reply) {
      appendChatMessage(data.reply, 'assistant');
    }

    // Refresh application state (dashboard, stock, production)
    if (isConfirmed && window.loadAllAppData) {
      window.loadAllAppData();
      showToast(getTranslation('successSaved'), 'success');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendChatMessage('பிழை ஏற்பட்டது.', 'assistant');
  }
}

function showTypingIndicator() {
  const id = 'typing_' + Date.now();
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return id;

  const bubble = document.createElement('div');
  bubble.id = id;
  bubble.className = 'chat-bubble assistant';
  bubble.innerHTML = '<span style="color: var(--accent-amber);">● ● ●</span>';
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

window.addEventListener('languageChanged', (e) => {
  if (speechRecognition) {
    speechRecognition.lang = (e.detail?.lang === 'en') ? 'en-IN' : 'ta-IN';
  }
});

