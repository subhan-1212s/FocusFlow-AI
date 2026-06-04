const BACKEND_API = 'http://localhost:5000/api';
const CURRENT_USER = 'user_demo@example.com';

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
  trigger.innerText = 'FF';
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
  const note = {
    userId: CURRENT_USER,
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
      sidebarIframe.contentWindow.postMessage({ action: 'REFRESH_NOTES' }, '*');
    }
  } catch (err) {
    console.error('FocusFlow clipping sync failed:', err);
  }
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

// Receive messages from sidebar Iframe
function handleIframeMessages(e) {
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

    sidebarIframe.contentWindow.postMessage({
      action: 'RESPOND_PAGE_DATA',
      title: document.title,
      url: window.location.href,
      textContent: pageContent
    }, '*');
  } 
  
  else if (e.data && e.data.action === 'CLOSE_SIDEBAR') {
    toggleSidebar();
  }
}

// Launch Injection
init();
