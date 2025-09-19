const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const clearChatBtn = document.getElementById('clear-chat-btn');

// Use a global messages array
const messages = [];

// --- New functions for localStorage ---
function saveChatHistory() {
  localStorage.setItem('chatHistory', JSON.stringify(messages));
}

function loadChatHistory() {
  const savedHistory = localStorage.getItem('chatHistory');
  if (savedHistory) {
    const loadedMessages = JSON.parse(savedHistory);
    messages.push(...loadedMessages);
    messages.forEach(msg => {
      // Convert role 'model' to 'bot' for the appendMessage function
      const sender = msg.role === 'model' ? 'bot' : 'user';
      appendMessage(sender, msg.content);
    });
  }
}
// --- End of new functions ---

// --- Event listener for the clear button ---
clearChatBtn.addEventListener('click', () => {
  // Ask for confirmation
  const isConfirmed = confirm('Are you sure you want to clear the chat history?');
  if (isConfirmed) {
    chatBox.innerHTML = '';
    messages.length = 0;
    localStorage.removeItem('chatHistory');
  }
});

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const userMessage = input.value.trim();
  if (!userMessage) return;

  appendMessage('user', userMessage);
  input.value = '';

  // Add user message to history and save
  messages.push({ role: 'user', content: userMessage });
  saveChatHistory(); // <-- Save after user message

  showTypingIndicator();

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: messages }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Something went wrong');
    }

    const { message } = await response.json();
    appendMessage('bot', message);

    // Add bot message to history and save
    messages.push({ role: 'model', content: message });
    saveChatHistory(); // <-- Save after bot message

  } catch (error) {
    console.error(error);
    appendMessage('bot', `Sorry, something went wrong: ${error.message}`);
  } finally {
    hideTypingIndicator();
  }
});

function appendMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);

  if (sender === 'bot') {
    msg.innerHTML = marked.parse(text);
  } else {
    msg.textContent = text;
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTypingIndicator() {
  const indicatorWrapper = document.createElement('div');
  indicatorWrapper.classList.add('message', 'bot');
  indicatorWrapper.id = 'typing-indicator';

  const dots = document.createElement('div');
  dots.classList.add('typing-indicator');
  dots.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;
  indicatorWrapper.appendChild(dots);
  chatBox.appendChild(indicatorWrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// --- Load history when the page loads ---
document.addEventListener('DOMContentLoaded', loadChatHistory);