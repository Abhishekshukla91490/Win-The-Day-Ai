# Win The Day AI - Complete Setup Guide

## 🚀 Quick Start

### Step 1: Create Supabase Account & Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Create a new project
4. Copy these credentials to `.env`:
   - `SUPABASE_URL` - From project settings
   - `SUPABASE_ANON_KEY` - From project settings (API Keys)
   - `SUPABASE_SERVICE_KEY` - From project settings (Service role key)

### Step 2: Create Database Tables

In Supabase SQL Editor, run this:

```sql
-- Users table (managed by Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Plans table
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Proofs table
CREATE TABLE proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proof_text TEXT NOT NULL,
  ai_feedback TEXT,
  score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_score INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Streaks table
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_update DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Similar policies for other tables...
```

### Step 3: Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm start
```

### Step 4: Test Login/Signup

```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

## ❌ Common Issues & Fixes

### 1. "Cannot find module '@supabase/supabase-js'"
```bash
cd backend
npm install
```

### 2. "SUPABASE_URL is undefined"
- Make sure `.env` file exists in `backend/` directory
- Check that all credentials are correctly filled in
- Restart the server after updating `.env`

### 3. "Invalid credentials or authentication failed"
- Verify SUPABASE_URL starts with `https://`
- Check ANON_KEY and SERVICE_KEY are correct
- Ensure Supabase project is active

### 4. "Email/password validation failed"
- Password must be at least 6 characters
- Email must be valid format

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/tasks` | Get user tasks (requires token) |
| POST | `/api/tasks` | Create new task (requires token) |
| GET | `/api/scores` | Get user scores |
| GET | `/api/streaks` | Get user streaks |

## 🔐 Authentication

All protected routes require a JWT token in the header:
```bash
Authorization: Bearer {access_token}
```

## 📚 File Structure

```
backend/
├── .env.example          # Environment template
├── index.js              # Main server file
├── config/
│   └── supabase.js       # Supabase client setup
├── controllers/
│   ├── authController.js # Auth logic
│   ├── tasksController.js
│   └── ...
├── routes/
│   ├── auth.js
│   ├── tasks.js
│   └── ...
├── middleware/
│   ├── authMiddleware.js # JWT verification
│   ├── errorMiddleware.js
│   ├── rateLimiter.js
│   └── security.js
└── package.json
```
