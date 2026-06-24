let BACKEND_API = 'https://chrome-extension-ts0n.onrender.com/api';
let CURRENT_USER = 'user_demo@example.com';

function isContextValid() {
  try {
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

function destroy() {
  try {
    const trigger = document.getElementById('focusflow-trigger');
    if (trigger) trigger.remove();
    
    const container = document.getElementById('focusflow-sidebar-container');
    if (container) container.remove();
    
    const tooltip = document.getElementById('focusflow-select-tooltip');
    if (tooltip) tooltip.remove();
    
    document.removeEventListener('mouseup', handleTextSelection);
    document.removeEventListener('keyup', handleTextSelection);
    window.removeEventListener('message', handleIframeMessages);
  } catch (e) {
    // Ignore cleanup errors
  }
}

function checkContext() {
  if (!isContextValid()) {
    destroy();
    return false;
  }
  return true;
}

function safeGetStorage(keys, callback) {
  if (!checkContext()) return;
  try {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) return;
      callback(items);
    });
  } catch (e) {
    destroy();
  }
}

function safeSetStorage(data, callback) {
  if (!checkContext()) return;
  try {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) return;
      if (callback) callback();
    });
  } catch (e) {
    destroy();
  }
}

function safeSendMessage(message, callback) {
  if (!checkContext()) return;
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return;
      }
      if (callback) callback(response);
    });
  } catch (e) {
    destroy();
  }
}

safeGetStorage(['user_id', 'api_url'], (items) => {
  if (items.user_id) CURRENT_USER = items.user_id;
  if (items.api_url) BACKEND_API = items.api_url;
});

// Detect dashboard page dynamically to set backend api_url and dashboard_url in local storage
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  const localApi = 'http://localhost:5000/api';
  BACKEND_API = localApi;
  safeSetStorage({ api_url: localApi, dashboard_url: window.location.origin });
} else if (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('focusflow')) {
  const prodApi = 'https://chrome-extension-ts0n.onrender.com/api';
  BACKEND_API = prodApi;
  safeSetStorage({ api_url: prodApi, dashboard_url: window.location.origin });
}

let sidebarContainer = null;
let shadowRoot = null;
let sidebarIframe = null;
let activeSelectionTooltip = null;
let sidebarIsOpen = false;

// Initialize Injections
function init() {
  // Prevent double injection
  if (document.getElementById('focusflow-sidebar-container')) return;

  // 1. Create floating action button
  const trigger = document.createElement('div');
  trigger.id = 'focusflow-trigger';
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  `;
  trigger.title = 'Open FocusFlow AI Assistant';
  document.body.appendChild(trigger);

  // 2. Create sidebar container and shadow DOM
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'focusflow-sidebar-container';
  sidebarContainer.style.position = 'fixed';
  sidebarContainer.style.top = '0';
  sidebarContainer.style.right = '0';
  sidebarContainer.style.width = '0px';
  sidebarContainer.style.height = '100vh';
  sidebarContainer.style.zIndex = '2147483641';
  sidebarContainer.style.transition = 'width 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
  document.body.appendChild(sidebarContainer);

  shadowRoot = sidebarContainer.attachShadow({ mode: 'open' });

  // 3. Inject Iframe into shadow root
  sidebarIframe = document.createElement('iframe');
  sidebarIframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
  sidebarIframe.style.width = '360px';
  sidebarIframe.style.height = '100vh';
  sidebarIframe.style.border = 'none';
  sidebarIframe.style.position = 'absolute';
  sidebarIframe.style.right = '-360px';
  sidebarIframe.style.top = '0';
  sidebarIframe.style.boxShadow = '-10px 0 40px rgba(0,0,0,0.3)';
  sidebarIframe.style.transition = 'right 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
  shadowRoot.appendChild(sidebarIframe);

  // 4. Set up click triggers
  trigger.addEventListener('click', toggleSidebar);

  // 5. Highlight selection listener
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('keyup', handleTextSelection);

  // 6. Setup cross-window communications
  window.addEventListener('message', handleIframeMessages);
}

function toggleSidebar() {
  if (!checkContext()) return;
  sidebarIsOpen = !sidebarIsOpen;
  
  if (sidebarIsOpen) {
    sidebarContainer.style.width = '360px';
    sidebarIframe.style.right = '0px';
    document.getElementById('focusflow-trigger').style.transform = 'rotate(-10deg) scale(0.95)';
  } else {
    sidebarIframe.style.right = '-360px';
    setTimeout(() => {
      if (!sidebarIsOpen) sidebarContainer.style.width = '0px';
    }, 350);
    document.getElementById('focusflow-trigger').style.transform = 'rotate(0deg) scale(1)';
  }
}

// Handle selected texts on host pages
function handleTextSelection(e) {
  if (!checkContext()) return;
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  // If selection is valid and has contents, show mini clippy badge
  if (selectedText.length > 5 && !sidebarIframe.contains(e.target) && e.target.id !== 'focusflow-trigger') {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (!activeSelectionTooltip) {
      activeSelectionTooltip = document.createElement('div');
      activeSelectionTooltip.id = 'focusflow-select-tooltip';
      activeSelectionTooltip.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span>Save Clip</span>
      `;
      document.body.appendChild(activeSelectionTooltip);
      
      activeSelectionTooltip.addEventListener('click', async () => {
        await saveHighlight(selectedText);
        removeSelectionTooltip();
        selection.removeAllRanges();
      });
    }

    // Position tooltip directly above selected text blocks
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    activeSelectionTooltip.style.top = `${rect.top + scrollTop - 38}px`;
    activeSelectionTooltip.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 45)}px`;
  } else {
    // Hide tooltip if clicked elsewhere or cleared selection
    setTimeout(() => {
      const selectionCheck = window.getSelection().toString().trim();
      if (selectionCheck.length <= 5) {
        removeSelectionTooltip();
      }
    }, 100);
  }
}

function removeSelectionTooltip() {
  if (activeSelectionTooltip) {
    activeSelectionTooltip.remove();
    activeSelectionTooltip = null;
  }
}

// Save Clipped text selection to backend DB
async function saveHighlight(text) {
  safeGetStorage('user_id', async (items) => {
    const activeUser = items.user_id || CURRENT_USER;
    const note = {
      userId: activeUser,
      url: window.location.href,
      domain: window.location.hostname,
      title: document.title || 'Web Clipping',
      content: text,
      tags: ['Highlight']
    };

    try {
      const response = await fetch(`${BACKEND_API}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });

      if (response.ok) {
        showToast('Selection saved to FocusFlow Knowledge Hub! ⚡');
        
        // Let sidebar know if it is open to refresh list
        if (sidebarIframe && sidebarIframe.contentWindow) {
          sidebarIframe.contentWindow.postMessage({ action: 'REFRESH_NOTES' }, '*');
        }
        
        // Broadcast to background worker to update any open dashboard tabs instantly
        safeSendMessage({ action: 'NOTE_SAVED' });
      }
    } catch (err) {
      console.error('FocusFlow clipping sync failed:', err);
    }
  });
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'focusflow-toast';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#10b981" stroke-width="2.5" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Receive messages from host page or sidebar
function handleIframeMessages(e) {
  if (!checkContext()) return;

  if (e.data && e.data.action === 'GET_PAGE_DATA') {
    // Gather parent page raw content blocks for AI summarizer
    const bodyTexts = [];
    const elements = document.querySelectorAll('h1, h2, h3, p, li');
    
    elements.forEach(el => {
      // Avoid reading content inside our extension wrappers
      if (!sidebarContainer.contains(el) && el.innerText) {
        bodyTexts.push(el.innerText.trim());
      }
    });

    const pageContent = bodyTexts.join('\n').substring(0, 10000);

    if (sidebarIframe && sidebarIframe.contentWindow) {
      sidebarIframe.contentWindow.postMessage({
        action: 'RESPOND_PAGE_DATA',
        title: document.title,
        url: window.location.href,
        textContent: pageContent
      }, '*');
    }
  } 
  
  else if (e.data && e.data.action === 'CLOSE_SIDEBAR') {
    toggleSidebar();
  }

  else if (e.data && e.data.action === 'REFRESH_PARENT_PAGE') {
    window.location.reload();
  }

  // Bridge messages from the webpage to the background script for workspaces
  else if (e.data && e.data.action === 'FOCUSFLOW_CAPTURE_TABS') {
    const name = e.data.name;
    safeSendMessage({ action: 'GET_ACTIVE_TABS' }, (response) => {
      if (response && response.tabs) {
        window.postMessage({
          action: 'FOCUSFLOW_TABS_RESPOND',
          tabs: response.tabs,
          name: name
        }, '*');
      }
    });
  }
  
  else if (e.data && e.data.action === 'FOCUSFLOW_RESTORE_WORKSPACE') {
    safeSendMessage({
      action: 'RESTORE_WORKSPACE',
      tabs: e.data.tabs
    });
  }
  
  else if (e.data && e.data.action === 'FOCUSFLOW_SYNC_USER') {
    safeSendMessage({ action: 'SYNC_USER', userId: e.data.userId });
  }
  
  else if (e.data && e.data.action === 'FOCUSFLOW_SYNC_GEMINI_KEY') {
    safeSetStorage({ gemini_key: e.data.geminiKey });
  }
  
  else if (e.data && e.data.action === 'FOCUSFLOW_REFRESH_BLOCKING_RULES') {
    safeSendMessage({ action: 'REFRESH_BLOCKING_RULES' });
  }
}

// Sync user and api_url from local storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (!isContextValid()) {
    destroy();
    return;
  }
  if (area === 'local') {
    if (changes.user_id) {
      CURRENT_USER = changes.user_id.newValue || 'user_demo@example.com';
    }
    if (changes.api_url) {
      BACKEND_API = changes.api_url.newValue || 'https://chrome-extension-ts0n.onrender.com/api';
    }
  }
});

// Listen for messages from background script to notify dashboard of a saved note
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isContextValid()) {
    destroy();
    return;
  }
  if (message.action === 'FOCUSFLOW_NOTE_SAVED') {
    window.postMessage({ action: 'FOCUSFLOW_NOTE_SAVED' }, '*');
  }
});

// Set global indicator attribute so webpage knows the extension is active
document.documentElement.setAttribute('data-focusflow-extension', 'true');

// Launch Injection
init();
