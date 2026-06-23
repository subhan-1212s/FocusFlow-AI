let activeTabId = null;
let activeStartTime = null;
let activeDomain = null;

let API_URL = 'https://chrome-extension-ts0n.onrender.com/api';
let USER_ID = 'user_demo@example.com';
chrome.storage.local.get(['user_id', 'api_url'], (items) => {
  if (items.user_id) USER_ID = items.user_id;
  if (items.api_url) API_URL = items.api_url;
  
  // Update rules immediately after retrieving the stored user and API configurations
  updateBlockingRules();
});

// Pomodoro Timer State
let pomoTimeLeft = 25 * 60; // 25 minutes default
let pomoIsRunning = false;
let pomoPhase = 'work'; // 'work' | 'break'
let pomoSessionCount = 1;
let pomoInterval = null;

// Track tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

// Track window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopTracking();
  } else {
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) await handleTabChange(tab.id);
    } catch (e) {
      console.error(e);
    }
  }
});

async function handleTabChange(tabId) {
  await stopTracking();
  
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && tab.url.startsWith('http')) {
      const domain = new URL(tab.url).hostname;
      activeTabId = tabId;
      activeDomain = domain;
      activeStartTime = Date.now();
      console.log(`Started tracking: ${domain}`);
    }
  } catch (e) {
    // Avoid console spamming on developer panel or internal chrome:// urls
  }
}

async function stopTracking() {
  if (activeStartTime && activeDomain) {
    const duration = Math.round((Date.now() - activeStartTime) / 1000);
    if (duration > 0) {
      const activity = {
        userId: USER_ID,
        domain: activeDomain,
        startTime: new Date(activeStartTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: duration
      };
      
      syncActivity(activity);
    }
  }
  activeTabId = null;
  activeStartTime = null;
  activeDomain = null;
}

async function syncActivity(activity) {
  try {
    await fetch(`${API_URL}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity)
    });
    console.log(`Synced: ${activity.domain} (${activity.duration}s)`);
  } catch (e) {
    console.error('Sync failed:', e);
  }
}

// Declarative Net Request Dynamic Blocking Rules
async function updateBlockingRules() {
  let blockedSites = [];
  let focusMode = false;
  let fetchedSuccessfully = false;

  try {
    const response = await fetch(`${API_URL}/preferences/${USER_ID}`);
    if (response.ok) {
      const data = await response.json();
      blockedSites = data.blockedSites || [];
      focusMode = data.focusMode || false;
      fetchedSuccessfully = true;

      // Cache rules locally
      await new Promise((resolve) => {
        chrome.storage.local.set({
          cached_blocked_sites: blockedSites,
          cached_focus_mode: focusMode
        }, resolve);
      });
    } else {
      throw new Error(`Server returned status ${response.status}`);
    }
  } catch (e) {
    console.warn('Network error: Failed to fetch blocking rules from server. Falling back to cache.', e.message);
    // Fallback to cache
    await new Promise((resolve) => {
      chrome.storage.local.get(['cached_blocked_sites', 'cached_focus_mode'], (items) => {
        blockedSites = items.cached_blocked_sites || [];
        focusMode = items.cached_focus_mode || false;
        resolve();
      });
    });
  }

  try {
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(r => r.id);

    // If focus mode is active, set up redirection rules
    if (focusMode && blockedSites.length > 0) {
      const rules = blockedSites.map((site, index) => {
        const cleanSite = site.replace(/^https?:\/\//i, '').replace(/^www\./i, '').trim();
        return {
          id: index + 1,
          priority: 1,
          action: { 
            type: 'redirect', 
            redirect: { extensionPath: '/blocked/blocked.html' } 
          },
          condition: { 
            urlFilter: `||${cleanSite}`, 
            resourceTypes: ['main_frame'] 
          }
        };
      });

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: rules
      });
      console.log(`Focus Mode Active: Blocking rules updated with redirection (${fetchedSuccessfully ? 'from server' : 'from cache'})`);
    } else {
      // Clear rules when Focus Mode is OFF
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: []
      });
      console.log(`Focus Mode Inactive: Blocking rules cleared (${fetchedSuccessfully ? 'from server' : 'from cache'})`);
    }
  } catch (e) {
    console.error('Failed to apply declarative blocking rules:', e);
  }
}

// Alarms to check for preference sync
chrome.alarms.create('syncPreferences', { periodInMinutes: 2 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncPreferences') {
    updateBlockingRules();
  }
});

// Context Menus for Selection Highlighting
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-focusflow',
    title: 'Save selection to FocusFlow Notes',
    contexts: ['selection']
  });
  
  // Set initial empty dynamic rules
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    addRules: []
  });
  
  // Sync on startup
  updateBlockingRules();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-focusflow' && info.selectionText) {
    const note = {
      userId: USER_ID,
      url: tab.url,
      domain: new URL(tab.url).hostname,
      title: tab.title || 'Web Clipper Highlight',
      content: info.selectionText,
      tags: ['Clipped']
    };

    try {
      const response = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note)
      });
      
      if (response.ok) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/popup/icon-128.png', // Fallback or standard notification icon
          title: 'Highlight Saved! 💡',
          message: 'Saved to your FocusFlow Knowledge Hub.',
          priority: 1
        });
      }
    } catch (e) {
      console.error('Failed to save context menu note:', e);
    }
  }
});

// Pomodoro Timer state management
function startPomodoro() {
  if (pomoIsRunning) return;
  pomoIsRunning = true;
  
  pomoInterval = setInterval(() => {
    if (pomoTimeLeft > 0) {
      pomoTimeLeft--;
    } else {
      handlePomodoroCompletion();
    }
  }, 1000);
}

function pausePomodoro() {
  pomoIsRunning = false;
  if (pomoInterval) {
    clearInterval(pomoInterval);
    pomoInterval = null;
  }
}

function resetPomodoro() {
  pausePomodoro();
  pomoPhase = 'work';
  pomoTimeLeft = 25 * 60;
}

async function handlePomodoroCompletion() {
  pausePomodoro();
  
  if (pomoPhase === 'work') {
    // Increment focus metric in DB (add a mock activity or increment local stats)
    // Add completed Pomodoro cycle to local storage blocked counter / focus tracking
    chrome.storage.local.get({ pomoCompleted: 0 }, (items) => {
      chrome.storage.local.set({ pomoCompleted: items.pomoCompleted + 1 });
    });
    
    // Trigger break session
    pomoPhase = 'break';
    pomoTimeLeft = 5 * 60; // 5 minutes break
    
    // Automation: Disable Focus Mode during Break!
    await toggleFocusModeAPI(false);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'popup/popup.html', // Chrome uses whatever page is accessible or standard paths
      title: 'Focus Cycle Complete! ☕',
      message: 'Great job! Take a 5-minute break. Focus mode is temporarily suspended.',
      priority: 2
    });
  } else {
    // Break finished, return to focus!
    pomoPhase = 'work';
    pomoTimeLeft = 25 * 60;
    pomoSessionCount++;
    
    // Automation: Re-enable Focus Mode!
    await toggleFocusModeAPI(true);

    chrome.notifications.create({
      type: 'basic',
      title: 'Break Over! 🧠',
      message: 'Time to focus. Focus mode has been reactivated. Let\'s make progress!',
      priority: 2
    });
  }
  
  // Auto restart next phase
  startPomodoro();
}

async function toggleFocusModeAPI(enable) {
  try {
    const prefResponse = await fetch(`${API_URL}/preferences/${USER_ID}`);
    const pref = await prefResponse.json();
    
    await fetch(`${API_URL}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: USER_ID,
        focusMode: enable,
        blockedSites: pref.blockedSites
      })
    });
    
    // Cache focus mode change immediately
    await new Promise((resolve) => {
      chrome.storage.local.set({
        cached_blocked_sites: pref.blockedSites || [],
        cached_focus_mode: enable
      }, resolve);
    });

    updateBlockingRules();
  } catch (e) {
    console.warn('Failed to toggle focus mode via server. Attempting offline fallback:', e.message);
    try {
      // Local fallback for offline focus mode toggling
      await new Promise((resolve) => {
        chrome.storage.local.set({
          cached_focus_mode: enable
        }, resolve);
      });
      updateBlockingRules();
    } catch (localErr) {
      console.error('Local Pomodoro fallback toggle failed:', localErr);
    }
  }
}

// Listen to tab updates to track last attempted URL and increment blocked attempts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) {
    if (tab.url.includes('/blocked/blocked.html')) {
      if (changeInfo.status === 'complete') {
        chrome.storage.local.get({ blockedAttempts: 0 }, (items) => {
          chrome.storage.local.set({ blockedAttempts: items.blockedAttempts + 1 });
        });
      }
    } else if (tab.url.startsWith('http')) {
      chrome.storage.local.set({ [`lastUrl_${tabId}`]: tab.url });
    }
  }
});

// Clean up stored tab URL history when tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`lastUrl_${tabId}`);
});

// Runtime Message Handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_POMODORO_STATE') {
    const minutes = Math.floor(pomoTimeLeft / 60);
    const seconds = pomoTimeLeft % 60;
    sendResponse({
      minutes,
      seconds,
      isRunning: pomoIsRunning,
      phase: pomoPhase,
      sessionCount: pomoSessionCount
    });
  }
  
  else if (message.action === 'START_POMODORO') {
    startPomodoro();
    sendResponse({ success: true });
  }
  
  else if (message.action === 'PAUSE_POMODORO') {
    pausePomodoro();
    sendResponse({ success: true });
  }
  
  else if (message.action === 'RESET_POMODORO') {
    resetPomodoro();
    sendResponse({ success: true });
  }
  
  else if (message.action === 'REFRESH_BLOCKING_RULES') {
    updateBlockingRules();
    sendResponse({ success: true });
  }
  
  else if (message.action === 'SYNC_USER') {
    if (message.userId) {
      USER_ID = message.userId;
      chrome.storage.local.set({ user_id: message.userId }, () => {
        updateBlockingRules();
      });
      sendResponse({ success: true });
    }
  }

  else if (message.action === 'NOTE_SAVED') {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && (tab.url.includes('localhost') || tab.url.includes('vercel.app') || tab.url.includes('chrome-extension-ts0n.onrender.com'))) {
          chrome.tabs.sendMessage(tab.id, { action: 'FOCUSFLOW_NOTE_SAVED' }).catch(() => {
            // Ignore errors for tabs without content script
          });
        }
      });
    });
    sendResponse({ success: true });
  }

  else if (message.action === 'GET_ACTIVE_TABS') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const filteredTabs = tabs
        .filter(t => t.url && t.url.startsWith('http'))
        .map(t => ({ title: t.title || 'Tab', url: t.url }));
      sendResponse({ success: true, tabs: filteredTabs });
    });
    return true; // Keep message channel open for async query
  }

  else if (message.action === 'RESTORE_WORKSPACE') {
    const tabs = message.tabs || [];
    if (tabs.length > 0) {
      chrome.windows.create({ focused: true }, (window) => {
        tabs.forEach((t, i) => {
          // Open in the newly created window, replace the default blank tab on first load
          if (i === 0) {
            chrome.tabs.update(window.tabs[0].id, { url: t.url });
          } else {
            chrome.tabs.create({ windowId: window.id, url: t.url });
          }
        });
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ error: 'No tabs in session' });
    }
  }
  
  return true; // Keep message channel open for async responses
});

// Sync user and API url on storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.user_id) {
      USER_ID = changes.user_id.newValue || 'user_demo@example.com';
      updateBlockingRules();
    }
    if (changes.api_url) {
      API_URL = changes.api_url.newValue || 'https://chrome-extension-ts0n.onrender.com/api';
      updateBlockingRules();
    }
  }
});
