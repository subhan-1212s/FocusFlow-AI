import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Clock, Shield, Layout, Settings, ChevronRight, CheckSquare, Calendar, 
  Trash2, Plus, Search, ExternalLink, Moon, Sparkles, BookOpen, Layers,
  AlertCircle, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Landing from './Landing';

let API_URL = import.meta.env.VITE_API_URL || 'https://chrome-extension-ts0n.onrender.com/api';
if (API_URL && !API_URL.endsWith('/api') && !API_URL.endsWith('/api/')) {
  API_URL = API_URL.endsWith('/') ? `${API_URL}api` : `${API_URL}/api`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15 
    } 
  }
};

const App = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userId, setUserId] = useState(localStorage.getItem('focusflow_user') || '');
  const [loading, setLoading] = useState(userId ? true : false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const [authTab, setAuthTab] = useState('signin'); // 'signin' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Core MERN State
  const [stats, setStats] = useState([]);
  const [preferences, setPreferences] = useState({ blockedSites: [], focusMode: false, dailyGoal: 480 });
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);

  // UI state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [noteSearch, setNoteSearch] = useState('');
  const [newBlockedSite, setNewBlockedSite] = useState('');
  const [newDailyGoal, setNewDailyGoal] = useState(480);

  // Sync state
  const [saveWorkspaceName, setSaveWorkspaceName] = useState('');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle redirects based on authentication
  useEffect(() => {
    if (userId && currentPath === '/login') {
      navigate('/dashboard');
    } else if (!userId && currentPath === '/dashboard') {
      navigate('/login');
    }
  }, [userId, currentPath]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  // Auth actions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Email and password are required');
      setAuthLoading(false);
      return;
    }

    try {
      const endpoint = authTab === 'signin' ? '/auth/login' : '/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, {
        email: authEmail.trim(),
        password: authPassword.trim()
      });

      if (res.data && res.data.email) {
        const loggedInEmail = res.data.email;
        localStorage.setItem('focusflow_user', loggedInEmail);
        setUserId(loggedInEmail);
        navigate('/dashboard');
        
        // Sync with Chrome Extension if present
        if (window.chrome && window.chrome.runtime) {
          window.chrome.runtime.sendMessage({ 
            action: 'SYNC_USER', 
            userId: loggedInEmail 
          });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Authentication failed. Please try again.';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('focusflow_user');
    setUserId('');
    setStats([]);
    setTasks([]);
    setNotes([]);
    setSessions([]);
    navigate('/');
    if (window.chrome && window.chrome.runtime) {
      window.chrome.runtime.sendMessage({ 
        action: 'SYNC_USER', 
        userId: 'user_demo@example.com' 
      });
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, prefRes, tasksRes, notesRes, sessionsRes] = await Promise.all([
        axios.get(`${API_URL}/stats/${userId}`),
        axios.get(`${API_URL}/preferences/${userId}`),
        axios.get(`${API_URL}/tasks/${userId}`),
        axios.get(`${API_URL}/notes/${userId}`),
        axios.get(`${API_URL}/sessions/${userId}`)
      ]);
      
      setStats(statsRes.data);
      setPreferences(prefRes.data);
      setNewDailyGoal(prefRes.data.dailyGoal || 480);
      setTasks(tasksRes.data);
      setNotes(notesRes.data);
      setSessions(sessionsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  // Focus Mode Actions
  const toggleFocusMode = async () => {
    try {
      const res = await axios.put(`${API_URL}/preferences`, {
        email: userId,
        focusMode: !preferences.focusMode,
        blockedSites: preferences.blockedSites
      });
      setPreferences(res.data);
      
      // If extension is loaded, tell it to update DNR dynamic rules immediately
      if (window.chrome && window.chrome.runtime) {
        window.chrome.runtime.sendMessage({ action: 'REFRESH_BLOCKING_RULES' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Task Actions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/tasks`, {
        userId: userId,
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        completed: false
      });
      setTasks([res.data, ...tasks]);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setShowTaskModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      const res = await axios.put(`${API_URL}/tasks/${taskId}`, {
        completed: !currentCompleted
      });
      setTasks(tasks.map(t => t._id === taskId ? res.data : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
    } catch (err) {
      console.error(err);
    }
  };

  // Notes/Highlights Actions
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Are you sure you want to delete this highlight?")) return;
    try {
      await axios.delete(`${API_URL}/notes/${noteId}`);
      setNotes(notes.filter(n => n._id !== noteId));
    } catch (err) {
      console.error(err);
    }
  };

  // Blocklist Settings Actions
  const handleAddBlockedSite = async (e) => {
    e.preventDefault();
    const site = newBlockedSite.trim().toLowerCase();
    if (!site) return;

    if (preferences.blockedSites.includes(site)) {
      setNewBlockedSite('');
      return;
    }

    try {
      const updatedList = [...preferences.blockedSites, site];
      const res = await axios.put(`${API_URL}/preferences`, {
        email: userId,
        blockedSites: updatedList
      });
      setPreferences(res.data);
      setNewBlockedSite('');
      
      // Update extension rules
      if (window.chrome && window.chrome.runtime) {
        window.chrome.runtime.sendMessage({ action: 'REFRESH_BLOCKING_RULES' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveBlockedSite = async (siteToRemove) => {
    try {
      const updatedList = preferences.blockedSites.filter(s => s !== siteToRemove);
      const res = await axios.put(`${API_URL}/preferences`, {
        email: userId,
        blockedSites: updatedList
      });
      setPreferences(res.data);
      
      // Update extension rules
      if (window.chrome && window.chrome.runtime) {
        window.chrome.runtime.sendMessage({ action: 'REFRESH_BLOCKING_RULES' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGoal = async (val) => {
    setNewDailyGoal(val);
    try {
      const res = await axios.put(`${API_URL}/preferences`, {
        email: userId,
        dailyGoal: parseInt(val, 10)
      });
      setPreferences(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Workspace restore
  const handleRestoreWorkspace = (session) => {
    const hasExtension = document.documentElement.getAttribute('data-focusflow-extension') === 'true';
    if (hasExtension) {
      window.postMessage({
        action: 'FOCUSFLOW_RESTORE_WORKSPACE',
        tabs: session.tabs
      }, '*');
    } else {
      // Plain browser fallback: Open all in new tabs
      session.tabs.forEach(t => {
        window.open(t.url, '_blank');
      });
    }
  };

  const handleSaveWorkspaceSession = async (e) => {
    e.preventDefault();
    const name = saveWorkspaceName.trim();
    if (!name) return;

    const hasExtension = document.documentElement.getAttribute('data-focusflow-extension') === 'true';
    
    if (hasExtension) {
      // Set a timeout. If the extension doesn't respond in 800ms, use the fallback list.
      const fallbackTimeout = setTimeout(() => {
        console.log("Extension did not respond, using fallback simulated tab list.");
        let fallbackTabs = [
          { title: "React Dev Docs", url: "https://react.dev" },
          { title: "GitHub", url: "https://github.com" },
          { title: "Gemini AI Studio", url: "https://aistudio.google.com" }
        ];
        saveSessionToDB(name, fallbackTabs);
      }, 800);

      // Register a one-time event handler for this response
      const handleResponse = (event) => {
        if (event.data && event.data.action === 'FOCUSFLOW_TABS_RESPOND' && event.data.name === name) {
          clearTimeout(fallbackTimeout);
          window.removeEventListener('message', handleResponse);
          saveSessionToDB(name, event.data.tabs || []);
        }
      };

      window.addEventListener('message', handleResponse);

      // Send capture tabs request to content.js
      window.postMessage({
        action: 'FOCUSFLOW_CAPTURE_TABS',
        name: name
      }, '*');
    } else {
      // Standalone browser fallback: save simulated list
      let fallbackTabs = [
        { title: "React Dev Docs", url: "https://react.dev" },
        { title: "GitHub", url: "https://github.com" },
        { title: "Gemini AI Studio", url: "https://aistudio.google.com" }
      ];
      saveSessionToDB(name, fallbackTabs);
    }
  };

  const saveSessionToDB = async (name, tabs) => {
    try {
      const res = await axios.post(`${API_URL}/sessions`, {
        userId: userId,
        name: name,
        tabs: tabs
      });
      setSessions(prev => [res.data, ...prev]);
      setSaveWorkspaceName('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await axios.delete(`${API_URL}/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s._id !== sessionId));
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations for dashboard overview
  const totalTrackedSeconds = stats.reduce((acc, curr) => acc + curr.totalDuration, 0);
  const totalTrackedMinutes = Math.floor(totalTrackedSeconds / 60);
  const completedTasksCount = tasks.filter(t => t.completed).length;
  
  // Calculate daily focus progress percentage
  const progressPercent = Math.min(
    (totalTrackedSeconds / ((preferences.dailyGoal || 480) * 60)) * 100, 
    100
  );

  // Colors for charts
  const COLORS = ['#C5A880', '#a3c4bc', '#d68c8c', '#e5ba73', '#9B7E4F'];
  const pieData = stats.slice(0, 5).map(item => ({
    name: item._id,
    value: Math.round(item.totalDuration / 60)
  }));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="spinner"></div>
        <div className="animate-pulse text-2xl font-bold tracking-tight">FocusFlow <span className="text-primary text-gradient">AI</span></div>
        <p className="text-slate-500 text-sm">Harmonising your workflow...</p>
      </div>
    </div>
  );

  if (currentPath === '/login') {
    return (
      <div className="auth-layout min-h-screen flex items-center justify-center bg-slate-950 text-white relative">
        <div className="auth-overlay"></div>
        <div className="absolute top-6 left-6 z-10">
          <button onClick={() => navigate('/')} className="btn btn-secondary text-xs flex items-center gap-2">
            ← Back to Home
          </button>
        </div>
        <motion.div 
          className="glass-card auth-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="auth-header">
            <h2>FocusFlow <span>AI</span></h2>
            <p className="auth-subtitle">Elevate your cognitive workspace</p>
          </div>

          <div className="auth-tabs">
            <button 
              onClick={() => { setAuthTab('signin'); setAuthError(''); }}
              className={`auth-tab-btn ${authTab === 'signin' ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setAuthTab('register'); setAuthError(''); }}
              className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`}
            >
              Create Account
            </button>
          </div>

          {authError && (
            <motion.div 
              className="auth-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={16} />
              <span>{authError}</span>
            </motion.div>
          )}

          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="you@domain.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4" disabled={authLoading}>
              {authLoading ? 'Validating credentials...' : authTab === 'signin' ? 'Access Workspace' : 'Initialize Account'}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Protected by secure cloud database encryption.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (currentPath === '/dashboard') {
    return (
      <div className="dashboard-layout">
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Side Navigation Drawer */}
      <aside className={`sidebar-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-logo-wrapper">
            <h2>FocusFlow <span>AI</span></h2>
          </div>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)} title="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="nav-links">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Layers size={18} /> Dashboard
          </button>
          <button 
            onClick={() => { setActiveTab('tasks'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            <CheckSquare size={18} /> Task Planner
          </button>
          <button 
            onClick={() => { setActiveTab('knowledge'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'knowledge' ? 'active' : ''}`}
          >
            <BookOpen size={18} /> Knowledge Hub
          </button>
          <button 
            onClick={() => { setActiveTab('workspaces'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'workspaces' ? 'active' : ''}`}
          >
            <Layers size={18} /> Workspaces
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>

        <div className="nav-footer">
          <div className="user-profile flex flex-col gap-2">
            <div className="flex items-center gap-2.5 w-full">
              <div className="avatar">{userId.substring(0, 2).toUpperCase()}</div>
              <div className="profile-info truncate" style={{ maxWidth: '140px' }}>
                <span className="profile-name truncate font-bold text-slate-200" title={userId}>{userId.split('@')[0]}</span>
                <span className="profile-role">Workspace User</span>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="btn btn-secondary w-full text-xs flex items-center justify-center"
              style={{ padding: '6px 12px', minHeight: 'auto', border: '1px solid rgba(214, 140, 140, 0.15)', color: 'var(--rose)', fontSize: '0.75rem', borderRadius: '10px' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile Top Navigation Bar */}
        <div className="mobile-top-bar">
          <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(true)} title="Open navigation">
            <Menu size={22} />
          </button>
          <div className="mobile-brand">
            <h2>FocusFlow <span>AI</span></h2>
          </div>
          <div style={{ width: 22 }}></div> {/* balancer spacer */}
        </div>

        <header className="content-header">
          <div>
            <h1>
              {activeTab === 'dashboard' && <>Workflow <span>Intelligence</span></>}
              {activeTab === 'tasks' && <>Smart <span>Task Planner</span></>}
              {activeTab === 'knowledge' && <>Knowledge <span>Hub</span></>}
              {activeTab === 'workspaces' && <>Tab <span>Workspace Sessions</span></>}
              {activeTab === 'settings' && <>FocusFlow <span>Preferences</span></>}
            </h1>
            <p>
              {activeTab === 'dashboard' && "Synchronised analytics tracking your flow state."}
              {activeTab === 'tasks' && "Map out your day, complete targets, and raise your focus score."}
              {activeTab === 'knowledge' && "Explore code highlights, web clippings, and notes saved across the internet."}
              {activeTab === 'workspaces' && "Restore entire browser windows and tab groups with one click."}
              {activeTab === 'settings' && "Manage distraction blocklists and configure Gemini AI credentials."}
            </p>
          </div>

          {activeTab === 'dashboard' && (
            <button 
              onClick={toggleFocusMode}
              className={`btn ${preferences.focusMode ? 'btn-rose animate-glow' : 'btn-primary'}`}
            >
              <Shield size={16} />
              {preferences.focusMode ? 'Disable Focus Mode' : 'Enable Focus Mode'}
            </button>
          )}
        </header>

        {/* Tab View Routers */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
          >
            {/* 1. ANALYTICS DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
              <div className="flex flex-col gap-6">
                {/* Stats Widgets */}
                <motion.div 
                  className="stats-grid"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div 
                    variants={itemVariants} 
                    className="glass-card stat-widget"
                    whileHover={{ y: -5, boxShadow: "0 12px 28px rgba(197, 168, 128, 0.15)", borderColor: "rgba(197, 168, 128, 0.25)" }}
                  >
                    <div className="stat-info">
                      <span className="label">Total Focus Time</span>
                      <span className="value">{Math.floor(totalTrackedMinutes / 60)}h {totalTrackedMinutes % 60}m</span>
                      <span className="trend">+12.4% from last week</span>
                    </div>
                    <div className="stat-icon-wrapper text-primary">
                      <Clock size={24} />
                    </div>
                  </motion.div>

                  <motion.div 
                    variants={itemVariants} 
                    className="glass-card stat-widget"
                    whileHover={{ y: -5, boxShadow: "0 12px 28px rgba(197, 168, 128, 0.15)", borderColor: "rgba(197, 168, 128, 0.25)" }}
                  >
                    <div className="stat-info">
                      <span className="label">Targets Met</span>
                      <span className="value">{completedTasksCount} / {tasks.length}</span>
                      <span className="trend text-emerald">Daily Goal Completed</span>
                    </div>
                    <div className="stat-icon-wrapper text-emerald">
                      <CheckSquare size={24} />
                    </div>
                  </motion.div>

                  <motion.div 
                    variants={itemVariants} 
                    className="glass-card stat-widget"
                    whileHover={{ y: -5, boxShadow: "0 12px 28px rgba(197, 168, 128, 0.15)", borderColor: "rgba(197, 168, 128, 0.25)" }}
                  >
                    <div className="stat-info">
                      <span className="label">Distractions Prevented</span>
                      <span className="value">42 attempts</span>
                      <span className="trend text-emerald">Saved ~1.5 hours today</span>
                    </div>
                    <div className="stat-icon-wrapper text-rose">
                      <Shield size={24} />
                    </div>
                  </motion.div>
                </motion.div>

                {/* Progress bar glass card */}
                <motion.div 
                  className="glass-card flex flex-col gap-4"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  whileHover={{ y: -2, boxShadow: "0 10px 24px rgba(197, 168, 128, 0.12)", borderColor: "rgba(197, 168, 128, 0.2)" }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-base">Daily Goal Progress</span>
                    <span style={{ color: 'var(--primary)' }} className="font-bold">{Math.round(progressPercent)}% completed</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <p className="text-slate-500 text-xs font-medium">Daily Target: {Math.round(preferences.dailyGoal / 60)} hours ({preferences.dailyGoal} minutes) tracked in host browsers.</p>
                </motion.div>

                {/* Charts Area */}
                <motion.div 
                  className="charts-grid"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {/* Time Distribution Area Chart */}
                  <motion.div 
                    className="glass-card"
                    whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(197, 168, 128, 0.12)", borderColor: "rgba(197, 168, 128, 0.2)" }}
                  >
                    <div className="chart-header">
                      <h3>Time Distribution (Minutes)</h3>
                      <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">Live Activity Domain Feed</span>
                    </div>
                    <div className="h-[300px] w-full mt-4">
                      {stats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.map(s => ({ name: s._id, Minutes: Math.round(s.totalDuration / 60) }))}>
                            <defs>
                              <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C5A880" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#C5A880" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(197, 168, 128, 0.08)" vertical={false} />
                            <XAxis dataKey="name" stroke="#8e8e93" fontSize={11} fontWeight={600} />
                            <YAxis stroke="#8e8e93" fontSize={11} fontWeight={600} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#050506', border: '1px solid rgba(197, 168, 128, 0.15)', borderRadius: '14px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="Minutes" stroke="#C5A880" strokeWidth={3} fillOpacity={1} fill="url(#colorMinutes)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 italic text-sm">No domain logging detected yet. Surf the web to track!</div>
                      )}
                    </div>
                  </motion.div>

                  {/* Distraction breakdown Pie Chart */}
                  <motion.div 
                    className="glass-card flex flex-col justify-between"
                    whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(197, 168, 128, 0.12)", borderColor: "rgba(197, 168, 128, 0.2)" }}
                  >
                    <div className="chart-header">
                      <h3>Category Breakdown</h3>
                    </div>
                    <div className="h-[220px] w-full relative flex items-center justify-center">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#050506', border: '1px solid rgba(197, 168, 128, 0.15)', borderRadius: '14px' }}
                              itemStyle={{ color: '#fff' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-slate-500 italic text-xs">No chart statistics logged.</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      {pieData.map((entry, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="text-slate-300 font-semibold truncate max-w-[120px]">{entry.name}</span>
                          </div>
                          <span className="font-bold text-slate-400">{entry.value} mins</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            )}

            {/* 2. SMART TASK PLANNER VIEW */}
            {activeTab === 'tasks' && (
              <div className="task-planner-view">
                <div className="planner-header-row">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold">Focus Target Board</h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Raise your productivity score by checking off tasks</p>
                  </div>
                  <button onClick={() => setShowTaskModal(true)} className="btn btn-primary">
                    <Plus size={16} /> New Task Target
                  </button>
                </div>

                <div className="task-columns-grid">
                  {/* Column 1: Pending */}
                  <div className="task-column">
                    <div className="column-title-bar">
                      <h3><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary-glow)' }}></span> Focus Targets</h3>
                      <span className="task-count-badge">{tasks.filter(t => !t.completed).length}</span>
                    </div>
                    {tasks.filter(t => !t.completed).length === 0 ? (
                      <p className="text-slate-600 italic text-xs text-center p-8">No pending targets. Map out a focus plan!</p>
                    ) : (
                      tasks.filter(t => !t.completed).map(task => (
                        <div key={task._id} className="task-card">
                          <div className="task-main">
                            <button 
                              onClick={() => handleToggleTask(task._id, task.completed)}
                              className="task-checkbox-btn"
                            ></button>
                            <span className="task-title">{task.title}</span>
                          </div>
                          {task.description && <p className="task-details">{task.description}</p>}
                          <div className="task-card-footer">
                            <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                            <button onClick={() => handleDeleteTask(task._id)} className="delete-task-btn" title="Delete Target">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Column 2: High Priority Focus (Focus Mode Targets) */}
                  <div className="task-column">
                    <div className="column-title-bar">
                      <h3><span className="w-2 h-2 rounded-full bg-rose-500 animate-glow"></span> Urgent Focus</h3>
                      <span className="task-count-badge">{tasks.filter(t => !t.completed && t.priority === 'high').length}</span>
                    </div>
                    {tasks.filter(t => !t.completed && t.priority === 'high').length === 0 ? (
                      <p className="text-slate-600 italic text-xs text-center p-8">No urgent high-priority targets listed.</p>
                    ) : (
                      tasks.filter(t => !t.completed && t.priority === 'high').map(task => (
                        <div key={task._id} className="task-card border-rose-500/20">
                          <div className="task-main">
                            <button 
                              onClick={() => handleToggleTask(task._id, task.completed)}
                              className="task-checkbox-btn"
                            ></button>
                            <span className="task-title font-bold text-rose-200">{task.title}</span>
                          </div>
                          {task.description && <p className="task-details">{task.description}</p>}
                          <div className="task-card-footer">
                            <span className="priority-badge high">URGENT</span>
                            <button onClick={() => handleDeleteTask(task._id)} className="delete-task-btn">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Column 3: Completed */}
                  <div className="task-column">
                    <div className="column-title-bar">
                      <h3><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed</h3>
                      <span className="task-count-badge">{tasks.filter(t => t.completed).length}</span>
                    </div>
                    {tasks.filter(t => t.completed).length === 0 ? (
                      <p className="text-slate-600 italic text-xs text-center p-8">No completed targets yet. Stay focused!</p>
                    ) : (
                      tasks.filter(t => t.completed).map(task => (
                        <div key={task._id} className="task-card opacity-65">
                          <div className="task-main">
                            <button 
                              onClick={() => handleToggleTask(task._id, task.completed)}
                              className="task-checkbox-btn checked"
                            >
                              <CheckSquare size={12} />
                            </button>
                            <span className="task-title completed">{task.title}</span>
                          </div>
                          <div className="task-card-footer">
                            <span className="priority-badge low">COMPLETED</span>
                            <button onClick={() => handleDeleteTask(task._id)} className="delete-task-btn">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Task Creation Modal */}
                {showTaskModal && (
                  <div className="modal-overlay">
                    <div className="modal-card">
                      <div className="modal-header">
                        <h3>New Focus Target</h3>
                      </div>
                      <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
                        <div className="form-group">
                          <label>Target Title</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Study JWT authentication..." 
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label>Description (Optional)</label>
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Read MDN documentation and code three express routes."
                            value={newTaskDesc}
                            onChange={(e) => setNewTaskDesc(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>Priority</label>
                          <select 
                            className="select-field"
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                          >
                            <option value="high">High (Urgent Focus)</option>
                            <option value="medium">Medium (Focus Target)</option>
                            <option value="low">Low (Standard Checklist)</option>
                          </select>
                        </div>
                        <div className="flex gap-3 justify-end mt-4">
                          <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-secondary">Cancel</button>
                          <button type="submit" className="btn btn-primary">Add Target</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. KNOWLEDGE HUB VIEW */}
            {activeTab === 'knowledge' && (
              <div className="knowledge-hub-view">
                <div className="hub-search-bar">
                  <div className="search-input-wrapper">
                    <Search className="search-icon" size={16} />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Search highlights by keyword or domain..." 
                      value={noteSearch}
                      onChange={(e) => setNoteSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="notes-grid">
                  {notes.filter(note => {
                    const term = noteSearch.toLowerCase();
                    return note.content.toLowerCase().includes(term) || note.domain.toLowerCase().includes(term);
                  }).length === 0 ? (
                    <div className="glass-card text-center p-12 text-slate-500 italic text-sm w-full col-span-3">
                      No matching web highlights captured yet. Double click text blocks on any website to clip highlights using FocusFlow.
                    </div>
                  ) : (
                    notes.filter(note => {
                      const term = noteSearch.toLowerCase();
                      return note.content.toLowerCase().includes(term) || note.domain.toLowerCase().includes(term);
                    }).map(note => (
                      <div key={note._id} className="glass-card note-card">
                        <div className="note-header-row">
                          <span className="note-domain">{note.domain}</span>
                          <button onClick={() => handleDeleteNote(note._id)} className="delete-task-btn" title="Delete Note">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="note-card-text">{note.content}</p>
                        <div className="flex justify-between items-center mt-2 border-t border-slate-900/80 pt-3">
                          <span className="note-title-meta" title={note.title}>{note.title}</span>
                          <a href={note.url} target="_blank" rel="noreferrer" className="btn-secondary p-1.5 rounded-lg transition" style={{ color: 'var(--primary)' }} title="Go to source web page">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 4. WORKSPACE SESSIONS VIEW */}
            {activeTab === 'workspaces' && (
              <div className="workspaces-view">
                <div className="glass-card flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold">Workspace Tab Session Capturer</h3>
                    <p className="text-xs text-slate-500 font-medium">Instantly snapshot all active tabs in this browser window and restore them later.</p>
                  </div>
                  <form onSubmit={handleSaveWorkspaceSession} className="flex gap-3">
                    <input 
                      type="text" 
                      className="input-field max-w-[200px]" 
                      placeholder="Workspace name..." 
                      value={saveWorkspaceName}
                      onChange={(e) => setSaveWorkspaceName(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} /> Save Workspace
                    </button>
                  </form>
                </div>

                <div className="workspace-list">
                  {sessions.length === 0 ? (
                    <div className="glass-card text-center p-12 text-slate-500 italic text-sm w-full col-span-2">
                      No saved tab workspaces listed. Save your tab research layouts above!
                    </div>
                  ) : (
                    sessions.map(session => (
                      <div key={session._id} className="glass-card session-card">
                        <div className="session-header">
                          <span className="session-name">{session.name}</span>
                          <span className="tab-count">{session.tabs.length} tabs saved</span>
                        </div>
                        <div className="session-tabs-list">
                          {session.tabs.map((tab, idx) => (
                            <div key={idx} className="tab-link-item">
                              <span className="tab-title-text" title={tab.title}>{tab.title}</span>
                              <a href={tab.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-slate-300">
                                <ExternalLink size={11} />
                              </a>
                            </div>
                          ))}
                        </div>
                        <div className="session-actions">
                          <button onClick={() => handleRestoreWorkspace(session)} className="btn btn-primary flex-1">
                            <Layers size={14} /> Restore Workspace
                          </button>
                          <button onClick={() => handleDeleteSession(session._id)} className="btn btn-secondary" title="Delete Workspace">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 5. CONFIGURATION SETTINGS VIEW */}
            {activeTab === 'settings' && (
              <div className="settings-view">
                
                {/* 5a. Blocklist Configuration */}
                <div className="glass-card settings-group">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold">Distraction Blocker List</h3>
                    <p className="text-xs text-slate-500">Known web domains to be redirected automatically during focus mode work intervals.</p>
                  </div>
                  <div className="blocklist-box">
                    <form onSubmit={handleAddBlockedSite} className="blocklist-input-row">
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. facebook.com" 
                        value={newBlockedSite}
                        onChange={(e) => setNewBlockedSite(e.target.value)}
                      />
                      <button type="submit" className="btn btn-primary">Add Domain</button>
                    </form>
                    <div className="blocklist-chips mt-4">
                      {preferences.blockedSites.length === 0 ? (
                        <p className="text-slate-500 italic text-xs">Your blocklist is empty. Ready for deep focus!</p>
                      ) : (
                        preferences.blockedSites.map(site => (
                          <div key={site} className="block-chip">
                            <span>{site}</span>
                            <button onClick={() => handleRemoveBlockedSite(site)} title="Remove Domain">×</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 5b. Goal Configuration */}
                <div className="glass-card settings-group">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold">Daily Focus Targets</h3>
                    <p className="text-xs text-slate-500">Configure your optimal total hours focused inside active host browser windows.</p>
                  </div>
                  <div className="settings-row">
                    <div className="settings-info">
                      <h4>Daily Goal: {Math.round(newDailyGoal / 60)} hours</h4>
                      <p>Currently configured at {newDailyGoal} minutes of tracking.</p>
                    </div>
                    <div className="w-[240px] flex items-center gap-4">
                      <input 
                        type="range" 
                        min="60" 
                        max="720" 
                        step="60" 
                        className="w-full cursor-pointer"
                        style={{ accentColor: 'var(--primary)' }}
                        value={newDailyGoal}
                        onChange={(e) => handleUpdateGoal(e.target.value)}
                      />
                    </div>
                  </div>
                </div>



              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
  }

  return <Landing onNavigate={navigate} isAuthenticated={!!userId} />;
};

export default App;
