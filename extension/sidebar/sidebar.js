const API_URL = 'http://localhost:5000/api';
const USER_ID = 'user_demo@example.com';

let currentTabDomain = '';
let currentTabUrl = '';
let currentTabTitle = '';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Tab Switching Logic
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      // Update Navigation button state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update Panel Pane visibility
      panes.forEach(pane => {
        if (pane.id === targetTab) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      // Load specific tab data
      if (targetTab === 'tasks') fetchTasks();
      if (targetTab === 'notes') fetchNotes();
    });
  });

  // 2. Close Sidebar Button
  document.getElementById('close-sidebar-btn').addEventListener('click', () => {
    window.parent.postMessage({ action: 'CLOSE_SIDEBAR' }, '*');
  });

  // 3. Pomodoro Timer State Sync
  syncPomodoro();
  setInterval(syncPomodoro, 1000);

  // Pomodoro controls in sidebar
  document.getElementById('sidebar-pomo-start').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'START_POMODORO' }, syncPomodoro);
  });
  document.getElementById('sidebar-pomo-pause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'PAUSE_POMODORO' }, syncPomodoro);
  });
  document.getElementById('sidebar-pomo-reset').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'RESET_POMODORO' }, syncPomodoro);
  });

  // 4. AI Chat Bot Submission
  const chatForm = document.getElementById('chat-form');
  chatForm.addEventListener('submit', handleChatSubmit);

  // 5. AI Page Summarizer
  document.getElementById('summarize-page-btn').addEventListener('click', requestPageSummarization);

  // 6. Tasks quick adding
  document.getElementById('quick-task-add-btn').addEventListener('click', quickAddTask);
  document.getElementById('quick-task-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') quickAddTask();
  });

  // 7. Receive page extraction responses from host content script
  window.addEventListener('message', handleHostMessages);

  // Fetch initial domain info
  fetchCurrentTabInfo();
});

// Synchronize Pomodoro timer ticking with background
function syncPomodoro() {
  chrome.runtime.sendMessage({ action: 'GET_POMODORO_STATE' }, (response) => {
    if (!response) return;
    const { minutes, seconds, isRunning, phase, sessionCount } = response;
    
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update ticking in Navigation tab header!
    const timerHeader = document.getElementById('pomo-tab-indicator');
    timerHeader.innerText = formattedTime;
    
    // Update Pomo Panel UIs
    document.getElementById('sidebar-pomo-time').innerText = formattedTime;
    document.getElementById('sidebar-pomo-phase').innerText = phase === 'work' ? 'POMODORO FOCUS' : 'SHORT BREAK';
    document.getElementById('sidebar-pomo-sessions').innerText = `Session #${sessionCount}`;

    // Adjust coloring based on phase
    if (phase === 'break') {
      document.getElementById('sidebar-pomo-phase').style.color = '#10b981';
      timerHeader.style.color = '#10b981';
    } else {
      document.getElementById('sidebar-pomo-phase').style.color = '#6366f1';
      timerHeader.style.color = isRunning ? '#6366f1' : '#64748b';
    }

    if (isRunning) {
      document.getElementById('sidebar-pomo-start').classList.add('hidden');
      document.getElementById('sidebar-pomo-pause').classList.remove('hidden');
    } else {
      document.getElementById('sidebar-pomo-start').classList.remove('hidden');
      document.getElementById('sidebar-pomo-pause').classList.add('hidden');
    }
  });
}

// Fetch active tab domain
async function fetchCurrentTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.startsWith('http')) {
      currentTabUrl = tab.url;
      currentTabDomain = new URL(tab.url).hostname;
      currentTabTitle = tab.title;
    }
  });
}

// --- AI CHAT ACTIONS ---
async function handleChatSubmit(e) {
  e.preventDefault();
  const chatInput = document.getElementById('chat-input');
  const prompt = chatInput.value.trim();
  if (!prompt) return;

  // Render User Message
  appendChatMessage(prompt, 'user-msg');
  chatInput.value = '';

  // Render typing AI message placeholder
  const aiMessageId = appendChatMessage('<div class="spinner"></div>', 'ai-msg');

  try {
    // Check if custom user Gemini key is saved in storage
    const storage = await chrome.storage.local.get('gemini_key');
    const userKey = storage.gemini_key || '';

    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, userKey })
    });
    const data = await response.json();
    
    // Overwrite typing container with formatted response
    const msgDiv = document.getElementById(aiMessageId);
    if (data.text) {
      msgDiv.innerHTML = parseMarkdown(data.text);
    } else {
      msgDiv.innerText = data.error || 'Oops, failed to fetch AI response.';
    }
  } catch (err) {
    const msgDiv = document.getElementById(aiMessageId);
    msgDiv.innerText = 'Unable to connect to the backend assistant service.';
    console.error(err);
  }
}

function appendChatMessage(htmlContent, className) {
  const container = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${className}`;
  const id = `msg-${Date.now()}`;
  msgDiv.id = id;
  msgDiv.innerHTML = className === 'user-msg' ? `<p>${escapeHtml(htmlContent)}</p>` : htmlContent;
  
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

// --- AI SUMMARIZER ACTIONS ---
function requestPageSummarization() {
  document.getElementById('summary-display').classList.add('hidden');
  document.getElementById('summary-loader').classList.remove('hidden');

  // Trigger parent tab document crawl via postMessage
  window.parent.postMessage({ action: 'GET_PAGE_DATA' }, '*');
}

async function handleHostMessages(e) {
  if (e.data && e.data.action === 'RESPOND_PAGE_DATA') {
    const { textContent, url, title } = e.data;

    try {
      const storage = await chrome.storage.local.get('gemini_key');
      const userKey = storage.gemini_key || '';

      const response = await fetch(`${API_URL}/ai/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textContent, url, title, userKey })
      });
      const data = await response.json();
      
      document.getElementById('summary-loader').classList.add('hidden');
      const display = document.getElementById('summary-display');
      display.classList.remove('hidden');
      
      if (data.summary) {
        display.innerHTML = parseMarkdown(data.summary);
      } else {
        display.innerText = data.error || 'Failed to synthesize summary.';
      }
    } catch (err) {
      document.getElementById('summary-loader').classList.add('hidden');
      const display = document.getElementById('summary-display');
      display.classList.remove('hidden');
      display.innerText = 'Failed to connect to backend summarizer API.';
      console.error(err);
    }
  } 
  
  else if (e.data && e.data.action === 'REFRESH_NOTES') {
    // If user highlights a clip, re-fetch notes to show instantly!
    fetchNotes();
  }
}

// --- TASKS ACTIONS ---
async function fetchTasks() {
  const container = document.getElementById('sidebar-task-list');
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

  try {
    const response = await fetch(`${API_URL}/tasks/${USER_ID}`);
    const tasks = await response.json();
    container.innerHTML = '';

    if (tasks.length === 0) {
      container.innerHTML = '<div class="empty-state">No pending tasks for today. Add one above!</div>';
      return;
    }

    tasks.forEach(task => {
      const row = document.createElement('div');
      row.className = 'task-row';
      
      row.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task._id}">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.title)}</span>
        <span class="task-priority-tag ${task.priority}">${task.priority}</span>
      `;
      
      // Wire checkoff trigger
      row.querySelector('.task-checkbox').addEventListener('click', async (e) => {
        const checkbox = e.currentTarget;
        const taskId = checkbox.getAttribute('data-id');
        const isChecked = checkbox.classList.contains('checked');
        
        try {
          await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: !isChecked })
          });
          
          checkbox.classList.toggle('checked');
          row.querySelector('.task-text').classList.toggle('completed');
        } catch (err) {
          console.error('Failed to update task checkoff:', err);
        }
      });

      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Unable to load tasks checklist.</div>';
  }
}

async function quickAddTask() {
  const input = document.getElementById('quick-task-input');
  const title = input.value.trim();
  if (!title) return;

  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        title,
        priority: 'medium',
        completed: false
      })
    });
    if (response.ok) {
      input.value = '';
      fetchTasks();
    }
  } catch (err) {
    console.error('Failed to quick add task:', err);
  }
}

// --- SAVED HIGHLIGHT NOTES ACTIONS ---
async function fetchNotes() {
  const container = document.getElementById('sidebar-notes-list');
  container.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

  try {
    const response = await fetch(`${API_URL}/notes/${USER_ID}`);
    const notes = await response.json();
    container.innerHTML = '';

    // Filter notes relevant to the current domain
    const siteNotes = notes.filter(n => n.domain === currentTabDomain);
    
    document.getElementById('site-notes-header').innerText = `Clipped from ${currentTabDomain || 'this site'}`;

    if (siteNotes.length === 0) {
      container.innerHTML = '<div class="empty-state">No clips captured from this domain yet.<br>Select any text on this page to clip highlights!</div>';
      return;
    }

    siteNotes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'note-item';
      
      const dateString = new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      item.innerHTML = `
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-meta">
          <span class="note-date">${dateString}</span>
          <button class="note-delete" data-id="${note._id}">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;

      item.querySelector('.note-delete').addEventListener('click', async (e) => {
        const noteId = e.currentTarget.getAttribute('data-id');
        if (confirm('Delete this highlight?')) {
          try {
            await fetch(`${API_URL}/notes/${noteId}`, { method: 'DELETE' });
            fetchNotes();
          } catch (err) {
            console.error('Note deletion failed:', err);
          }
        }
      });

      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = '<div class="empty-state">Unable to load clips.</div>';
  }
}

// --- UTILITIES ---
function parseMarkdown(md) {
  // Extremely simple regex-based markdown parser to avoid importing marked library
  let html = md;
  
  // Headers (### Header)
  html = html.replace(/###\s*(.*?)\n/g, '<h3>$1</h3>');
  html = html.replace(/##\s*(.*?)\n/g, '<h3>$1</h3>');
  
  // Bold (**bold**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Code block (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code (`code`)
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Bullet Points (- list item)
  html = html.replace(/^\s*-\s*(.*?)\n/gm, '<li>$1</li>');
  // Wrap li blocks in ul
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  // Remove duplicates ul wraps
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Line breaks
  html = html.replace(/\n\n/g, '<p></p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
