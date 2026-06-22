let API_URL = 'https://chrome-extension-ts0n.onrender.com/api';
let USER_ID = 'user_demo@example.com';
let DASHBOARD_URL = 'http://localhost:5173'; // Default fallback

document.addEventListener('DOMContentLoaded', async () => {
  let interval;
  chrome.storage.local.get(['user_id', 'api_url', 'dashboard_url'], async (items) => {
    if (items.user_id) USER_ID = items.user_id;
    if (items.api_url) API_URL = items.api_url;
    if (items.dashboard_url) DASHBOARD_URL = items.dashboard_url;

    // Initial draw
    updateUI();
    syncPomodoroState();
    
    // Set up periodic update
    interval = setInterval(() => {
      updateUI();
      syncPomodoroState();
    }, 1000);

    // Open Full Dashboard
    document.getElementById('open-dashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: DASHBOARD_URL });
    });

    // Toggle Focus Mode
    document.getElementById('toggle-focus').addEventListener('click', async () => {
      const btn = document.getElementById('toggle-focus');
      const isFocus = btn.innerText.includes('Stop') || btn.innerText.includes('Disable');
      
      try {
        const prefResponse = await fetch(`${API_URL}/preferences/${USER_ID}`);
        const pref = await prefResponse.json();
        
        const response = await fetch(`${API_URL}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: USER_ID,
            focusMode: !isFocus,
            blockedSites: pref.blockedSites
          })
        });
        const data = await response.json();
        updateFocusUI(data.focusMode);
        
        // Let background script know to refresh rules immediately
        chrome.runtime.sendMessage({ action: 'REFRESH_BLOCKING_RULES' });
      } catch (e) {
        console.error(e);
      }
    });

    // Quick Block/Unblock Website
    document.getElementById('quick-block-btn').addEventListener('click', async () => {
      const domainSpan = document.getElementById('current-domain');
      const domain = domainSpan.innerText;
      if (domain === 'None' || !domain) return;

      try {
        const prefResponse = await fetch(`${API_URL}/preferences/${USER_ID}`);
        let pref = await prefResponse.json();
        let blockedSites = pref.blockedSites || [];

        if (blockedSites.includes(domain)) {
          blockedSites = blockedSites.filter(s => s !== domain);
        } else {
          blockedSites.push(domain);
        }

        const response = await fetch(`${API_URL}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: USER_ID,
            blockedSites: blockedSites
          })
        });
        const data = await response.json();
        
        // Notify background to update declarativeNetRequest rules
        chrome.runtime.sendMessage({ action: 'REFRESH_BLOCKING_RULES' });
        
        // Update quick block button text
        updateQuickBlockUI(domain, blockedSites);
      } catch (e) {
        console.error(e);
      }
    });

    // Pomodoro Controls Message Passing
    document.getElementById('pomo-start').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'START_POMODORO' }, () => {
        syncPomodoroState();
      });
    });

    document.getElementById('pomo-pause').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'PAUSE_POMODORO' }, () => {
        syncPomodoroState();
      });
    });

    document.getElementById('pomo-reset').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'RESET_POMODORO' }, () => {
        syncPomodoroState();
      });
    });

    // Cleanup on close
    window.addEventListener('unload', () => clearInterval(interval));
  });
});

// Sync Pomodoro UI with Background state
function syncPomodoroState() {
  chrome.runtime.sendMessage({ action: 'GET_POMODORO_STATE' }, (response) => {
    if (!response) return;

    const { minutes, seconds, isRunning, phase, sessionCount } = response;
    
    // Format Display
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    document.getElementById('timer-display').innerText = `${formattedMinutes}:${formattedSeconds}`;

    // Play/Pause buttons
    if (isRunning) {
      document.getElementById('pomo-start').classList.add('hidden');
      document.getElementById('pomo-pause').classList.remove('hidden');
    } else {
      document.getElementById('pomo-start').classList.remove('hidden');
      document.getElementById('pomo-pause').classList.add('hidden');
    }

    // Phase Label & Session Count
    document.getElementById('pomo-phase').innerText = phase === 'work' ? 'POMODORO FOCUS' : 'SHORT BREAK';
    document.getElementById('pomo-session-count').innerText = `Session #${sessionCount}`;

    // Tweak Pomodoro label style for Break vs Work
    const phaseLabel = document.getElementById('pomo-phase');
    if (phase === 'break') {
      phaseLabel.style.color = '#10b981'; // Emerald break
    } else {
      phaseLabel.style.color = '#6366f1'; // Indigo focus
    }
  });
}

// Fetch stats and active tab from server/Chrome
async function updateUI() {
  try {
    // 1. Get current active tab domain
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let currentDomain = 'None';
    if (tab && tab.url && tab.url.startsWith('http')) {
      currentDomain = new URL(tab.url).hostname;
    }
    document.getElementById('current-domain').innerText = currentDomain;

    // 2. Fetch User preferences (focusMode, blockedSites)
    const prefResponse = await fetch(`${API_URL}/preferences/${USER_ID}`);
    const pref = await prefResponse.json();
    
    updateFocusUI(pref.focusMode);
    updateQuickBlockUI(currentDomain, pref.blockedSites || []);

    // 3. Fetch tracked activity stats from server
    const statsResponse = await fetch(`${API_URL}/stats/${USER_ID}`);
    const stats = await statsResponse.json();
    
    let totalSeconds = 0;
    stats.forEach(item => totalSeconds += item.totalDuration);
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    document.getElementById('today-time').innerText = `${hours}h ${minutes}m`;

    // 4. Progress calculation relative to user's daily goal (default 8 hours)
    const dailyGoalMinutes = pref.dailyGoal || 480; 
    const goalSeconds = dailyGoalMinutes * 60;
    const progress = Math.min((totalSeconds / goalSeconds) * 100, 100);
    
    document.getElementById('daily-progress').style.width = `${progress}%`;
    document.getElementById('progress-percent').innerText = `${Math.round(progress)}% of daily goal (${Math.round(dailyGoalMinutes/60)}h)`;

    // 5. Blocked attempts count (mocked/fetched)
    // In a real extensions, we can fetch from background count or an endpoint. 
    // We'll store blocked count in local storage and fetch it here.
    chrome.storage.local.get({ blockedAttempts: 0 }, (items) => {
      document.getElementById('blocked-count').innerText = items.blockedAttempts;
    });

  } catch (e) {
    console.error('UI update failed:', e);
  }
}

function updateFocusUI(isFocus) {
  const btn = document.getElementById('toggle-focus');
  const badge = document.getElementById('focus-status');
  
  if (isFocus) {
    btn.innerText = 'Disable Focus Mode';
    btn.className = 'btn secondary'; // secondary button in focus mode to disable it
    badge.innerText = 'Focus Mode Active';
    badge.style.background = 'rgba(99, 102, 241, 0.15)';
    badge.style.color = '#6366f1';
    badge.style.borderColor = 'rgba(99, 102, 241, 0.3)';
  } else {
    btn.innerText = 'Enable Focus Mode';
    btn.className = 'btn primary animate-hover';
    badge.innerText = 'Tracking Active';
    badge.style.background = 'rgba(16, 185, 129, 0.12)';
    badge.style.color = '#10b981';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
  }
}

function updateQuickBlockUI(domain, blockedSites) {
  const btn = document.getElementById('quick-block-btn');
  if (domain === 'None') {
    btn.style.display = 'none';
    return;
  }
  
  btn.style.display = 'block';
  if (blockedSites.includes(domain)) {
    btn.innerText = 'Unblock';
    btn.classList.add('unblock');
  } else {
    btn.innerText = 'Block Site';
    btn.classList.remove('unblock');
  }
}

// Sync user, api_url, and dashboard_url from local storage changes in the popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.user_id) {
      USER_ID = changes.user_id.newValue || 'user_demo@example.com';
    }
    if (changes.api_url) {
      API_URL = changes.api_url.newValue || 'https://chrome-extension-ts0n.onrender.com/api';
    }
    if (changes.dashboard_url) {
      DASHBOARD_URL = changes.dashboard_url.newValue || 'http://localhost:5173';
    }
    updateUI();
  }
});
