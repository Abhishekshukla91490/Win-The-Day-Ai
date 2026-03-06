/**
 * WinTheDay - Single-file backend implementation (Express + Postgres + OpenAI-compatible)
 *
 * Place this at: backend/src/index.js
 *
 * Required env vars (backend/.env):
 *   DATABASE_URL=postgres://user:pass@host:5432/dbname
 *   SESSION_SECRET=some_secret
 *   OPENAI_API_KEY=sk_...
 *   AI_MODEL=optional_model_name (e.g., gpt-4, gpt-4o-mini) -- defaults used if unset
 *   NODE_ENV=development
 *   FRONTEND_URL=http://localhost:8080
 *
 * Install dependencies:
 * npm install express openai pg bcrypt dotenv express-session body-parser cors uuid
 *
 * Run:
 * node backend/src/index.js
 *
 * NOTE: Keep your OPENAI_API_KEY and other secrets out of chat and version control.
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Load env
dotenv.config();

// OpenAI client
const OpenAI = require('openai');
const aiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Simple query helper
const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

// Helper to parse AI JSON outputs robustly
function tryParseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    // try to extract JSON code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {}
    }
    // try to find first {...}
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (e) {}
    }
  }
  return null;
}

/* -------------------------
   AI Service functions
   ------------------------- */

async function generateDailyPlan({ availableHours, subjectsGoals, priority }) {
  const system = `You are an assistant that outputs ONLY valid JSON representing a daily plan for a college student.`;
  const user = `
Generate a JSON object:
{
  "date": "<YYYY-MM-DD>",
  "tasks": [
    { "name": "<short task name>", "category": "Academic"|"Skill"|"Health", "duration_minutes": <int>, "notes": "<optional>"}
    ...
  ]
}
Requirements:
- Return between 3 and 6 tasks.
- Include at least one task with category "Health".
- Total duration should roughly match availableHours (in hours).
- Use concise task names and realistic durations.
User inputs:
availableHours: ${availableHours}
subjectsGoals: ${JSON.stringify(subjectsGoals || [])}
priority: ${priority || 'none'}
`;

  try {
    const resp = await aiClient.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = resp.choices?.[0]?.message?.content || '';
    const parsed = tryParseJSON(content);
    if (!parsed || !Array.isArray(parsed.tasks)) {
      // fallback deterministic plan
      return {
        date: new Date().toISOString().slice(0, 10),
        tasks: [
          { name: 'Study: Topic 1', category: 'Academic', duration_minutes: 60 },
          { name: 'Practice coding', category: 'Skill', duration_minutes: 45 },
          { name: 'Quick exercise', category: 'Health', duration_minutes: 20 },
        ],
      };
    }
    const tasks = parsed.tasks.map((t) => ({
      name: t.name,
      category: t.category || 'Academic',
      duration_minutes: Math.max(5, Math.round(t.duration_minutes || t.duration || 30)),
      notes: t.notes || null,
    }));

    // ensure at least one Health
    if (!tasks.some((t) => t.category === 'Health')) {
      tasks.push({ name: 'Quick health: 15-min walk', category: 'Health', duration_minutes: 15 });
    }

    return {
      date: parsed.date || new Date().toISOString().slice(0, 10),
      tasks,
    };
  } catch (err) {
    console.error('generateDailyPlan error', err?.message || err);
    return {
      date: new Date().toISOString().slice(0, 10),
      tasks: [
        { name: 'Study: Topic 1', category: 'Academic', duration_minutes: 60 },
        { name: 'Practice coding', category: 'Skill', duration_minutes: 45 },
        { name: 'Quick exercise', category: 'Health', duration_minutes: 20 },
      ],
    };
  }
}

async function verifyReflection({ task, reflection }) {
  const system = `You are an objective verifier. Output ONLY valid JSON: {"verdict":"APPROVED"|"REJECTED","reason":"<brief>"} .`;
  const user = `
Task:
Name: ${task.name}
Category: ${task.category}
Duration: ${task.duration_minutes || 'N/A'}
Reflection: "${reflection}"

Rules:
- If the reflection clearly describes verifiable actions related to the task (what was done, resources used, time spent), return APPROVED.
- If vague/off-topic/insufficient, return REJECTED.
Return only JSON.
`;

  try {
    const resp = await aiClient.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.0,
      max_tokens: 300,
    });

    const content = resp.choices?.[0]?.message?.content || '';
    const parsed = tryParseJSON(content);

    if (parsed && parsed.verdict) {
      const v = String(parsed.verdict).toUpperCase();
      return { verdict: v === 'APPROVED' ? 'APPROVED' : 'REJECTED', reason: parsed.reason || '' };
    }

    // heuristic fallback
    const lower = reflection.toLowerCase();
    const keywords = ['read', 'solved', 'practiced', 'wrote', 'implemented', 'completed', 'reviewed', 'coded', 'ran'];
    const found = keywords.some((k) => lower.includes(k));
    if (found && reflection.length >= 30) {
      return { verdict: 'APPROVED', reason: 'Heuristic approval' };
    }
    return { verdict: 'REJECTED', reason: 'Heuristic rejection' };
  } catch (err) {
    console.error('verifyReflection error', err?.message || err);
    return { verdict: 'REJECTED', reason: 'AI error' };
  }
}

async function generateDailyReview({ tasks, executionScore }) {
  const system = `You are a supportive coach. Produce a short plain-text daily review (2-4 sentences) and one short suggestion.`;
  const user = `
Execution Score: ${executionScore}
Tasks: ${JSON.stringify(tasks, null, 2)}
Return a concise review and one suggestion.
`;

  try {
    const resp = await aiClient.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return (resp.choices?.[0]?.message?.content || '').trim();
  } catch (err) {
    console.error('generateDailyReview error', err?.message || err);
    return `You verified ${tasks.filter(t => t.ai_verdict === 'APPROVED').length} of ${tasks.length} tasks. Keep showing up — focus on one priority tomorrow.`;
  }
}

/* -------------------------
   Express app and routes
   ------------------------- */

const app = express();

app.use(bodyParser.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true },
}));

// ---------- Auth routes ----------
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users(id, email, password_hash) VALUES($1,$2,$3) RETURNING id, email, created_at',
      [uuidv4(), email, hash]
    );
    const user = result.rows[0];
    req.session.userId = user.id;
    res.json({ user });
  } catch (err) {
    console.error('register error', err?.message || err);
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await db.query('SELECT id, email, password_hash FROM users WHERE email=$1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('login error', err?.message || err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ status: 'ok' }));
});

// Middleware to check auth
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ---------- Plans ----------
app.post('/api/plans/generate', requireAuth, async (req, res) => {
  const { availableHours, subjectsGoals, priority, date } = req.body;
  try {
    const aiPlan = await generateDailyPlan({ availableHours, subjectsGoals, priority });
    const planDate = date || aiPlan.date || new Date().toISOString().slice(0, 10);

    const upsertQ = `
      INSERT INTO daily_plans (id, user_id, date, input_hours, subjects_goals, priority, created_at)
      VALUES ($1,$2,$3,$4,$5,$6, now())
      ON CONFLICT (user_id, date) DO UPDATE
      SET input_hours = EXCLUDED.input_hours, subjects_goals = EXCLUDED.subjects_goals, priority = EXCLUDED.priority
      RETURNING id, user_id, date, input_hours, subjects_goals, priority, created_at
    `;
    const planId = uuidv4();
    const planRes = await db.query(upsertQ, [
      planId,
      req.session.userId,
      planDate,
      availableHours || null,
      subjectsGoals && subjectsGoals.length ? JSON.stringify(subjectsGoals) : null,
      priority || null,
    ]);
    const plan = planRes.rows[0];

    // Remove existing tasks for this plan (if any) and insert new tasks
    await db.query('DELETE FROM tasks WHERE plan_id = $1', [plan.id]);

    const inserted = [];
    for (const t of aiPlan.tasks) {
      const insertQ = `
        INSERT INTO tasks (id, plan_id, name, category, duration_minutes, status, created_at)
        VALUES ($1,$2,$3,$4,$5,'Pending', now())
        RETURNING *
      `;
      const tid = uuidv4();
      const taskRes = await db.query(insertQ, [tid, plan.id, t.name, t.category, t.duration_minutes]);
      inserted.push(taskRes.rows[0]);
    }

    res.json({ plan, tasks: inserted });
  } catch (err) {
    console.error('plans.generate error', err?.message || err);
    res.status(500).json({ error: 'Plan generation failed' });
  }
});

app.get('/api/plans/:date', requireAuth, async (req, res) => {
  const date = req.params.date;
  try {
    const planRes = await db.query('SELECT * FROM daily_plans WHERE user_id=$1 AND date=$2', [req.session.userId, date]);
    const plan = planRes.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const tasksRes = await db.query('SELECT * FROM tasks WHERE plan_id=$1 ORDER BY created_at', [plan.id]);
    res.json({ plan, tasks: tasksRes.rows });
  } catch (err) {
    console.error('get plan error', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// ---------- Tasks verification ----------
app.post('/api/tasks/:taskId/verify', requireAuth, async (req, res) => {
  const { taskId } = req.params;
  const { reflection } = req.body;

  if (!reflection || typeof reflection !== 'string' || reflection.length < 20 || reflection.length > 300) {
    return res.status(400).json({ error: 'Reflection must be a string between 20 and 300 characters' });
  }

  try {
    const taskQ = `
      SELECT t.*, dp.user_id FROM tasks t
      JOIN daily_plans dp ON dp.id = t.plan_id
      WHERE t.id = $1
    `;
    const taskRes = await db.query(taskQ, [taskId]);
    const taskRow = taskRes.rows[0];
    if (!taskRow) return res.status(404).json({ error: 'Task not found' });
    if (taskRow.user_id !== req.session.userId) return res.status(403).json({ error: 'Forbidden' });

    if ((taskRow.attempt_count || 0) >= 3) {
      return res.status(400).json({ error: 'Maximum attempts reached' });
    }

    const { verdict, reason } = await verifyReflection({ task: taskRow, reflection });

    const attemptCount = (taskRow.attempt_count || 0) + 1;
    const aiVerdict = verdict === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    let status = 'Verifying';
    let verifiedAt = null;
    if (aiVerdict === 'APPROVED') {
      status = 'Verified';
      verifiedAt = new Date();
    } else if (attemptCount >= 3) {
      status = 'Unverified';
    }

    const updateQ = `
      UPDATE tasks SET reflection_text=$1, ai_verdict=$2, attempt_count=$3, status=$4, verified_at=$5
      WHERE id=$6 RETURNING *
    `;
    const updatedRes = await db.query(updateQ, [reflection, aiVerdict, attemptCount, status, verifiedAt, taskId]);
    const updated = updatedRes.rows[0];

    res.json({ verdict: aiVerdict, reason, attemptCount, status, task: updated });
  } catch (err) {
    console.error('tasks.verify error', err?.message || err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ---------- Score & daily review ----------
app.get('/api/plans/:date/score', requireAuth, async (req, res) => {
  const date = req.params.date;
  try {
    const planRes = await db.query('SELECT * FROM daily_plans WHERE user_id=$1 AND date=$2', [req.session.userId, date]);
    const plan = planRes.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const tasksRes = await db.query('SELECT id, name, category, ai_verdict, attempt_count FROM tasks WHERE plan_id=$1', [plan.id]);
    const tasks = tasksRes.rows;

    const total = tasks.length || 0;
    const verifiedCount = tasks.filter(t => t.ai_verdict === 'APPROVED').length;
    const score = total === 0 ? 0 : Math.round((verifiedCount / total) * 100);

    const review = await generateDailyReview({ tasks, executionScore: score });

    res.json({ date, total, verifiedCount, score, review, tasks });
  } catch (err) {
    console.error('plans.score error', err?.message || err);
    res.status(500).json({ error: 'Failed to compute score' });
  }
});

/* -------------------------
   Start server
   ------------------------- */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`WinTheDay API listening on port ${PORT}`);
});