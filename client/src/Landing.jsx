import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Shield, Sparkles, Layers, ChevronRight, ExternalLink, 
  Menu, X, Download, Eye, ArrowRight
} from 'lucide-react';

const Landing = ({ onNavigate, isAuthenticated }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 85, damping: 14 }
    }
  };

  const faqs = [
    {
      q: "How does the Chrome Extension track my time?",
      a: "The extension monitors active tab focus state. It only counts active browsing minutes (when the tab is active and the window is focused) to ensure highly precise, non-intrusive productivity tracking."
    },
    {
      q: "Is my browsing data private?",
      a: "Absolutely. All tracked site visits and logs are synced to your private MongoDB database. Your data is never shared with third parties or external servers, except when sending explicitly highlighted text to the Gemini API for summaries."
    },
    {
      q: "Do I need to pay for a Gemini API key?",
      a: "No! Google AI Studio offers a free tier for developers. You can easily generate a free API key and insert it into the settings page of FocusFlow AI to unlock page summarization and chat features."
    },
    {
      q: "How does the custom site blocker work?",
      a: "It utilizes Chrome's advanced Declarative Net Request (DNR) API. When Focus Mode is enabled, the browser intercepts requests to blacklisted domains and redirects them to a premium Obsidian-styled FocusFlow dashboard to prevent distractions."
    }
  ];

  return (
    <div className="landing-page">
      {/* Decorative Glow Elements */}
      <div className="landing-glow landing-glow-1" />
      <div className="landing-glow landing-glow-2" />
      <div className="landing-glow landing-glow-3" />

      {/* Header / Navbar */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <div className="landing-logo-group">
            <div className="landing-logo-box">
              <Sparkles size={16} />
            </div>
            <h2 className="landing-logo-text">
              FocusFlow <span>AI</span>
            </h2>
          </div>

          {/* Desktop Nav Links */}
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#install" className="landing-nav-link">Install Extension</a>
            <a href="#faq" className="landing-nav-link">FAQ</a>
            <a href="https://github.com/subhan-1212s/Chrome-Extension" target="_blank" rel="noopener noreferrer" className="landing-nav-link flex-link">
              GitHub <ExternalLink size={12} />
            </a>
          </nav>

          <div className="landing-actions">
            <button 
              onClick={() => onNavigate(isAuthenticated ? '/dashboard' : '/login')}
              className="btn btn-primary"
            >
              {isAuthenticated ? 'Enter Workspace' : 'Launch Dashboard'}
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile menu toggler */}
          <button 
            className="landing-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="landing-mobile-menu"
            >
              <div className="landing-mobile-menu-inner">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">Features</a>
                <a href="#install" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">Install Extension</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="mobile-nav-link">FAQ</a>
                <a href="https://github.com/subhan-1212s/Chrome-Extension" target="_blank" rel="noopener noreferrer" className="mobile-nav-link flex-link">
                  GitHub <ExternalLink size={12} />
                </a>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate(isAuthenticated ? '/dashboard' : '/login');
                  }}
                  className="btn btn-primary w-full-btn"
                >
                  {isAuthenticated ? 'Enter Workspace' : 'Launch Dashboard'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="landing-title"
        >
          A Premium AI Workspace to <br />
          <span className="gold-text-gradient">
            Elevate Your Flow State
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="landing-subtitle"
        >
          Automated browser tracking, intelligent distraction blocking, and an on-page AI companion integrated into a fully synchronized luxury dashboard.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="landing-hero-ctas"
        >
          <a href="#install" className="btn btn-primary py-3-5 px-8">
            <Download size={18} />
            Install Extension
          </a>
          <button 
            onClick={() => onNavigate(isAuthenticated ? '/dashboard' : '/login')}
            className="btn btn-secondary py-3-5 px-8"
          >
            <Eye size={18} />
            Launch Dashboard
          </button>
        </motion.div>

        {/* Hero Interactive Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 45 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="landing-hero-mockup"
        >
          <div className="landing-mockup-fade" />
          <div className="landing-mockup-header">
            <div className="landing-mockup-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="landing-mockup-url">
              <span className="url-dot" />
              focusflow-ai.vercel.app/dashboard
            </div>
          </div>
          <div className="landing-mockup-body">
            {/* Dashboard Mockup Panel */}
            <div className="mockup-dashboard-panel">
              <div className="mockup-dash-header">
                <div className="mockup-dash-title-group">
                  <div className="mockup-block mockup-block-title" />
                  <div className="mockup-block mockup-block-subtitle" />
                </div>
                <div className="mockup-dash-badge" />
              </div>
              <div className="mockup-dash-grid">
                <div className="mockup-dash-card">
                  <div className="mockup-block mockup-block-card-title" />
                  <div className="mockup-block mockup-block-card-val primary-val" />
                </div>
                <div className="mockup-dash-card">
                  <div className="mockup-block mockup-block-card-title" />
                  <div className="mockup-block mockup-block-card-val emerald-val" />
                </div>
                <div className="mockup-dash-card">
                  <div className="mockup-block mockup-block-card-title" />
                  <div className="mockup-block mockup-block-card-val rose-val" />
                </div>
              </div>
              <div className="mockup-chart-container">
                <div className="mockup-chart-bars">
                  <div className="chart-bar bar-20" />
                  <div className="chart-bar bar-45" />
                  <div className="chart-bar bar-30" />
                  <div className="chart-bar bar-65 animated-bar" />
                  <div className="chart-bar bar-40" />
                </div>
              </div>
            </div>

            {/* Extension Mockup Panel */}
            <div className="mockup-extension-panel">
              <div className="mockup-ext-header">
                <div className="mockup-ext-logo-group">
                  <div className="mockup-logo-mini">FF</div>
                  <span className="mockup-ext-logo-text">FocusFlow Popup</span>
                </div>
                <span className="mockup-ext-status-dot" />
              </div>
              <div className="mockup-ext-card">
                <div className="mockup-ext-card-label">Active Website</div>
                <div className="mockup-ext-card-value">github.com/developer-repo</div>
                <div className="mockup-ext-progress-track">
                  <div className="mockup-ext-progress-fill" />
                </div>
              </div>
              <div className="mockup-ext-actions">
                <div className="mockup-focus-badge">FOCUS ENABLED</div>
                <div className="mockup-spark-btn">
                  <Sparkles size={11} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Section */}
      <section id="features" className="features-section">
        <div className="landing-max-width">
          <div className="features-header">
            <h2 className="features-section-title">
              Designed to Preserve Your <span className="gold-text-gradient">Cognitive Load</span>
            </h2>
            <p className="features-section-desc">
              FocusFlow AI operates quietly in the background, only intervening when you veer off course or request smart content assistance.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="bento-grid"
          >
            {/* Bento Card 1: Browsing Analytics (Large: 8 cols) */}
            <motion.div 
              variants={itemVariants}
              className="bento-card bento-col-8 bento-row-2"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
              }}
            >
              <div>
                <div className="feature-icon-box primary-icon">
                  <Clock size={20} />
                </div>
                <h3 className="feature-card-title">Browsing Analytics</h3>
                <p className="feature-card-desc">
                  Automatically measure and categorize your tab interactions. Built-in duration processing prevents idle time skewing.
                </p>
              </div>

              {/* Inline SVG Chart Visualization */}
              <div className="live-feed-card">
                <div className="live-feed-header">
                  <span>LIVE PRODUCTIVITY FEED</span>
                  <span className="live-feed-status">
                    <span className="live-feed-pulse-dot"></span> ACTIVE
                  </span>
                </div>
                <div className="live-feed-body">
                  <div className="live-feed-item">
                    <div className="live-feed-bar-track">
                      <div className="live-feed-bar-fill primary" style={{ width: '80%' }}></div>
                    </div>
                    <span className="live-feed-site-name">github.com</span>
                  </div>
                  <div className="live-feed-item">
                    <div className="live-feed-bar-track">
                      <div className="live-feed-bar-fill primary" style={{ width: '45%' }}></div>
                    </div>
                    <span className="live-feed-site-name">stackoverflow.com</span>
                  </div>
                  <div className="live-feed-item">
                    <div className="live-feed-bar-track">
                      <div className="live-feed-bar-fill rose" style={{ width: '20%' }}></div>
                    </div>
                    <span className="live-feed-site-name blocked">youtube.com (Blocked)</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 2: Site Blocking (Small: 4 cols) */}
            <motion.div 
              variants={itemVariants}
              className="bento-card bento-col-4"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
              }}
            >
              <div>
                <div className="feature-icon-box rose-icon">
                  <Shield size={20} />
                </div>
                <h3 className="feature-card-title">Active Shield</h3>
                <p className="feature-card-desc">
                  Redirect distracting URLs instantly using native Chrome network interception.
                </p>
              </div>

              {/* Mini visual shield block indicator */}
              <div className="shield-indicator">
                <div className="shield-glow" />
                <div className="shield-content">
                  <span className="shield-title">Shield Engaged</span>
                  <span className="shield-subtitle">No distraction leakage</span>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 3: Gemini AI (Medium: 5 cols) */}
            <motion.div 
              variants={itemVariants}
              className="bento-card bento-col-5"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
              }}
            >
              <div>
                <div className="feature-icon-box gold-icon">
                  <Sparkles size={20} />
                </div>
                <h3 className="feature-card-title">Gemini Companion</h3>
                <p className="feature-card-desc">
                  Highlight browser text for instantaneous summaries. Interact directly with Gemini AI side panel companion.
                </p>
              </div>

              {/* Chat bubble visual indicator */}
              <div className="gemini-chat-bubble">
                <div className="gemini-bubble-title">
                  <Sparkles size={10} /> Gemini Summarizer
                </div>
                <div className="gemini-bubble-text">
                  "This function optimizes memory usage by utilizing standard streams..."
                </div>
              </div>
            </motion.div>

            {/* Bento Card 4: Session Workspaces (Large: 7 cols) */}
            <motion.div 
              variants={itemVariants}
              className="bento-card bento-col-7 bento-row-2"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
                e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
              }}
            >
              <div>
                <div className="feature-icon-box emerald-icon">
                  <Layers size={20} />
                </div>
                <h3 className="feature-card-title">Session Workspaces</h3>
                <p className="feature-card-desc">
                  Capture all open browser tabs under customized workspace profiles. Restore tab groups with a single click.
                </p>
              </div>

              {/* Stacked tabs illustration */}
              <div className="tab-group-illustration">
                <div className="tab-illustration-item active">
                  <span className="tab-ill-title">React Dev Documentation</span>
                  <span className="tab-illustration-badge active">Active</span>
                </div>
                <div className="tab-illustration-item inactive opacity-75">
                  <span className="tab-ill-title">GitHub Repository / Client</span>
                  <span className="tab-illustration-badge inactive">Inactive</span>
                </div>
                <div className="tab-illustration-item inactive opacity-50">
                  <span className="tab-ill-title">Gemini API Quickstart</span>
                  <span className="tab-illustration-badge inactive">Inactive</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Chrome Extension Installation Instructions */}
      <section id="install" className="install-section">
        <div className="install-max-width">
          <div className="flex-center">
            <div className="install-badge">
              <Download size={12} /> Easy Installation
            </div>
          </div>
          <h2 className="install-title">
            How to Load the FocusFlow <span className="gold-text-gradient">Chrome Extension</span>
          </h2>
          <p className="install-desc">
            FocusFlow is loaded as an unpacked browser extension in Developer Mode. Complete these steps in under 2 minutes:
          </p>

          {/* Stepper Timeline UI */}
          <div className="stepper-timeline">
            <div className="stepper-step">
              <div className="stepper-badge">01</div>
              <div className="stepper-content">
                <h4 className="stepper-title">Download the Repository</h4>
                <p className="stepper-desc">
                  Clone the project repository from GitHub. The extension folder contains all required manifests, stylesheets, background workers, and assets.
                </p>
              </div>
            </div>

            <div className="stepper-step">
              <div className="stepper-badge">02</div>
              <div className="stepper-content">
                <h4 className="stepper-title">Open Extension Panel</h4>
                <p className="stepper-desc">
                  Open a new tab in Google Chrome, navigate to <code className="gold-code">chrome://extensions/</code>, or click the settings menu -&gt; Extensions.
                </p>
              </div>
            </div>

            <div className="stepper-step">
              <div className="stepper-badge">03</div>
              <div className="stepper-content">
                <h4 className="stepper-title">Enable Developer Mode</h4>
                <p className="stepper-desc">
                  Locate the **"Developer Mode"** toggle switch in the top right corner of the extension settings page and switch it to **ON**.
                </p>
              </div>
            </div>

            <div className="stepper-step">
              <div className="stepper-badge">04</div>
              <div className="stepper-content">
                <h4 className="stepper-title">Load Unpacked Folder</h4>
                <p className="stepper-desc">
                  Click **"Load unpacked"** in the top left, then select the <code className="gold-code">/extension</code> folder in your cloned project path.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="faq-max-width">
          <div className="faq-header">
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <p className="faq-desc">Everything you need to know about the FocusFlow ecosystem.</p>
          </div>

          <div className="faq-accordion">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className="faq-item"
              >
                <button 
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="faq-question-btn"
                >
                  <span className="faq-q-text">{faq.q}</span>
                  <ChevronRight 
                    size={16} 
                    className={`faq-arrow ${activeFaq === index ? 'faq-arrow-active' : ''}`}
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="faq-answer">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="cta-footer-section">
        <div className="cta-footer-content">
          <h2 className="cta-footer-title">
            Ready to Deepen Your <br />
            <span className="gold-text-gradient">Productivity Workflows?</span>
          </h2>
          <p className="cta-footer-desc">
            Get started by adding the Chrome extension and initializing your statistics dashboard now.
          </p>
          <button 
            onClick={() => onNavigate(isAuthenticated ? '/dashboard' : '/login')}
            className="btn btn-primary py-4 px-10 text-base-bold"
          >
            Launch Free Workspace
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-max-width">
          <div className="landing-logo-group">
            <div className="landing-logo-box">
              <Sparkles size={16} />
            </div>
            <h2 className="landing-logo-text">
              FocusFlow <span>AI</span>
            </h2>
          </div>
          <p className="footer-copyright">© {new Date().getFullYear()} FocusFlow AI. MIT Licensed. Crafted with premium design aesthetics.</p>
          <div className="footer-links">
            <a href="#features" className="footer-link">Features</a>
            <a href="#install" className="footer-link">Install</a>
            <a href="https://github.com/subhan-1212s/Chrome-Extension" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
