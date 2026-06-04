const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Activity = require('./models/Activity');
const User = require('./models/User');
const Task = require('./models/Task');
const Note = require('./models/Note');
const Session = require('./models/Session');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- ACTIVITY ENDPOINTS ---
app.post('/api/activity', async (req, res) => {
  try {
    const { userId, domain, startTime, endTime, duration } = req.body;
    const activity = new Activity({ userId, domain, startTime, endTime, duration });
    await activity.save();
    res.status(201).json({ message: 'Activity tracked successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await Activity.aggregate([
      { $match: { userId } },
      { $group: { _id: '$domain', totalDuration: { $sum: '$duration' } } },
      { $sort: { totalDuration: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PREFERENCES & USER ENDPOINTS ---
app.get('/api/preferences/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
        // Create user if doesn't exist for simplicity in this demo
        const newUser = new User({ email: req.params.email, blockedSites: [], dailyGoal: 480 });
        await newUser.save();
        return res.json(newUser);
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/preferences', async (req, res) => {
  try {
    const { email, blockedSites, focusMode, dailyGoal } = req.body;
    const update = {};
    if (blockedSites !== undefined) update.blockedSites = blockedSites;
    if (focusMode !== undefined) update.focusMode = focusMode;
    if (dailyGoal !== undefined) update.dailyGoal = dailyGoal;

    const user = await User.findOneAndUpdate(
      { email },
      update,
      { new: true, upsert: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TASKS ENDPOINTS ---
app.get('/api/tasks/:userId', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { userId, title, description, priority, completed, dueDate } = req.body;
    const task = new Task({ userId, title, description, priority, completed, dueDate });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTES & HIGHLIGHTS ENDPOINTS ---
app.get('/api/notes/:userId', async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { userId, url, domain, title, content, tags } = req.body;
    const note = new Note({ userId, url, domain, title, content, tags });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WORKSPACE SESSIONS ENDPOINTS ---
app.get('/api/sessions/:userId', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { userId, name, tabs } = req.body;
    const session = new Session({ userId, name, tabs });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sessions/:id', async (req, res) => {
  try {
    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workspace session deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GEMINI AI ENDPOINTS ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, history, userKey } = req.body;
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.json({ 
        text: `### 🔑 API Key Needed\nTo use the AI Assistant, please set the \`GEMINI_API_KEY\` in your backend \`.env\` file, or provide your own key in the **Settings** panel on the FocusFlow dashboard!\n\n*(Meanwhile, here is a helpful productivity tip: Try working in 25-minute Pomodoro bursts with clear 5-minute breaks in between to maintain cognitive stamina.)*` 
      });
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{
            text: `You are FocusFlow AI, an extremely intelligent, premium, and concise productivity companion.
Your goals:
1. Help users stay focused and manage distractions.
2. Answer coding queries, explain technical terms, and solve coding doubts cleanly and directly.
3. Provide advice on workflow design and time management.
Format all answers beautifully using rich markdown, with emojis, structured bullet points, and code highlighting if applicable.
Keep responses concise, relevant, and engaging.

User prompt: ${prompt}`
          }]
        }
      ]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      res.json({ text: data.candidates[0].content.parts[0].text });
    } else if (data.error) {
      res.status(400).json({ error: data.error.message });
    } else {
      res.status(500).json({ error: 'Unexpected response from Gemini API', details: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { textContent, url, title, userKey } = req.body;
    const apiKey = userKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        summary: `### 🔑 API Key Needed
Please add your **Gemini API Key** in the **Settings** tab of the React dashboard or specify \`GEMINI_API_KEY\` in the server \`.env\` to unlock instant summaries.

*(If you are developing locally, you can easily grab a free API key from Google AI Studio!)*`
      });
    }

    const cleanedText = (textContent || '').trim().substring(0, 10000);
    const summaryPrompt = `Analyze the content of the following web page:
Title: "${title || 'Unknown'}"
URL: "${url || 'Unknown'}"

Provide a concise, high-quality structured summary of this page tailored for productivity and learning.
Format your output EXACTLY as the following markdown structure:

### 📝 Overview
[Provide a 2-3 sentence high-level, clear overview of the page content]

### 💡 Key Takeaways
- **[Takeaway 1]**: [Detailed explanation of key concept or insight]
- **[Takeaway 2]**: [Detailed explanation of key concept or insight]
- **[Takeaway 3]**: [Detailed explanation of key concept or insight]

### ⚡ Practical Workflow Insight
[An actionable advice or workflow recommendation based on this content]

Here is the raw text content of the webpage:
${cleanedText}`;

    const payload = {
      contents: [{ parts: [{ text: summaryPrompt }] }]
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      res.json({ summary: data.candidates[0].content.parts[0].text });
    } else if (data.error) {
      res.status(400).json({ error: data.error.message });
    } else {
      res.status(500).json({ error: 'Unexpected response from Gemini API', details: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

