const API_URL = 'http://localhost:5000/api';
const USER_ID = 'user_demo@example.com';

const QUOTES = [
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Your focus is your reality.", author: "Qui-Gon Jinn" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "Deep work is not some nostalgic affectation of a bygone era. It is instead an indispensable skill.", author: "Cal Newport" },
  { text: "There is no traffic jam along the extra mile.", author: "Roger Staubach" },
  { text: "Only the focused mind can paint a masterpiece.", author: "Unknown" }
];

document.addEventListener('DOMContentLoaded', () => {
  // Set Random Quote
  setRandomQuote();
  
  // Set up breathing guide text loop
  runBreathingGuide();
  
  // Sync Pomodoro Timer
  syncTimer();
  setInterval(syncTimer, 1000);

  // Button: Go Back to a safe workspace
  document.getElementById('go-back-btn').addEventListener('click', () => {
    // Navigate away to a productive dashboard or generic homepage
    window.location.href = 'http://localhost:5173';
  });

  // Button: Disable Focus Mode (Emergency Override)
  document.getElementById('disable-focus-btn').addEventListener('click', async () => {
    if (confirm("Are you sure you want to disable Focus Mode? Let's take a deep breath first!")) {
      try {
        const prefResponse = await fetch(`${API_URL}/preferences/${USER_ID}`);
        const pref = await prefResponse.json();
        
        await fetch(`${API_URL}/preferences`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: USER_ID,
            focusMode: false,
            blockedSites: pref.blockedSites
          })
        });
        
        // Notify background worker to refresh rules immediately
        chrome.runtime.sendMessage({ action: 'REFRESH_BLOCKING_RULES' }, () => {
          // Go back in history or redirect
          window.location.href = 'http://localhost:5173';
        });
      } catch (e) {
        console.error('Failed to disable Focus Mode:', e);
      }
    }
  });
});

function setRandomQuote() {
  const randomIndex = Math.floor(Math.random() * QUOTES.length);
  const selectedQuote = QUOTES[randomIndex];
  document.getElementById('quote-display').innerText = `"${selectedQuote.text}"`;
  document.getElementById('author-display').innerText = `— ${selectedQuote.author}`;
}

function runBreathingGuide() {
  const breathingLabel = document.getElementById('breathing-text');
  
  // Loops breathing instructions synced with breathing animation (8s total)
  // Inhale: 3.6s, Hold: 0.8s, Exhale: 3.6s
  const breatheLoop = () => {
    breathingLabel.innerText = "Inhale slowly...";
    breathingLabel.style.opacity = 1;
    
    setTimeout(() => {
      breathingLabel.innerText = "Hold your breath...";
    }, 3600);
    
    setTimeout(() => {
      breathingLabel.innerText = "Exhale gently...";
    }, 4400);
    
    setTimeout(() => {
      breathingLabel.innerText = "Prepare...";
    }, 7600);
  };
  
  breatheLoop();
  setInterval(breatheLoop, 8000);
}

function syncTimer() {
  chrome.runtime.sendMessage({ action: 'GET_POMODORO_STATE' }, (response) => {
    if (!response) return;

    const { minutes, seconds, phase } = response;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    
    document.getElementById('timer-display').innerText = `${formattedMinutes}:${formattedSeconds}`;
    
    const label = document.getElementById('timer-phase');
    if (phase === 'break') {
      label.innerText = 'REST & RECHARGE CYCLE';
      label.style.color = '#10b981'; // Emerald break
    } else {
      label.innerText = 'FOCUS SESSION TIMEOUT';
      label.style.color = '#6366f1'; // Indigo focus
    }
  });
}
