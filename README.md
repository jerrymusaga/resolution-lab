# Resolution Lab - Complete Local Setup Guide

## Option 1: Download Everything (Recommended)

Download the `resolution-lab` folder from this conversation. It contains all the code.

Then follow the steps below starting from **Step 2**.

---

## Option 2: Create From Scratch

If you prefer to create the project step by step, follow ALL steps below.

---

## Step 1: Create Project Structure

Open your terminal and run:

```bash
# Create main project folder
mkdir resolution-lab
cd resolution-lab

# Create folder structure
mkdir -p backend/routers backend/services backend/models backend/utils
mkdir -p frontend docs scripts
```

---

## Step 2: Set Up Python Environment

```bash
cd resolution-lab/backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install fastapi==0.115.6 uvicorn[standard]==0.34.0 python-dotenv==1.0.1 pydantic==2.10.4 pydantic-settings==2.7.1 supabase==2.11.0 asyncpg==0.30.0 opik==1.3.4 litellm==1.56.4 google-generativeai==0.8.4 httpx==0.27.2 python-multipart==0.0.20
```

---

## Step 3: Get Your API Keys

### 3.1 Opik (Comet) - For Observability
1. Go to https://www.comet.com/signup
2. Create a free account
3. After login, go to **Settings** (gear icon) → **API Keys**
4. Click **"Generate New API Key"**
5. Copy the API key
6. Note your workspace name (shown in the URL or settings)

### 3.2 Google Gemini - For LLM
1. Go to https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select a project or create new one
5. Copy the API key

### 3.3 Supabase - For Database
1. Go to https://supabase.com/dashboard
2. Create a free account
3. Click **"New Project"**
4. Fill in:
   - Project name: `resolution-lab`
   - Database password: (save this!)
   - Region: Choose closest to you
5. Wait for project to be created (~2 minutes)
6. Go to **Settings** → **API**
7. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (click to reveal)

---

## Step 4: Create Environment File

Create a file called `.env` in the `backend` folder:

```bash
cd resolution-lab/backend
```

Create `.env` with this content (fill in YOUR keys):

```env
# App Configuration
DEBUG=true

# Supabase - Get from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_anon_key
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_service_key

# Opik (Comet) - Get from https://www.comet.com/account-settings/apiKeys
OPIK_API_KEY=your_opik_api_key_here
OPIK_WORKSPACE=your_workspace_name
OPIK_PROJECT_NAME=resolution-lab

# Google Gemini - Get from https://aistudio.google.com/apikey
GOOGLE_API_KEY=your_gemini_api_key_here
```

---

## Step 5: Set Up Database

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **"New Query"**
4. Copy and paste this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interventions sent to users
CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opik_trace_id TEXT
);

-- User outcomes (check-ins)
CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL,
    response_time_seconds INTEGER,
    user_feedback TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated strategy statistics per user
CREATE TABLE IF NOT EXISTS user_strategy_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    total_interventions INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    avg_response_time_seconds FLOAT,
    effectiveness_score FLOAT DEFAULT 0.0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, strategy)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_interventions_user ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_goal ON interventions(goal_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_user ON outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_stats_user ON user_strategy_stats(user_id);
```

5. Click **"Run"** (or Cmd+Enter / Ctrl+Enter)
6. You should see "Success. No rows returned"

---

## Step 6: Run the Backend Server

```bash
cd resolution-lab/backend

# Make sure virtual environment is activated
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
🚀 Starting Resolution Lab v0.1.0
✅ Opik configured for project: resolution-lab
✅ Google Gemini API configured
✅ LiteLLM Opik callback enabled
```

---

## Step 7: Test the API

Open your browser and go to:

**http://localhost:8000/docs**

This opens the Swagger UI where you can test all endpoints!

### Quick Test:

1. **Test Health Check:**
   - Click on `GET /health`
   - Click "Try it out" → "Execute"
   - Should return: `{"status": "healthy", "app": "Resolution Lab", "version": "0.1.0"}`

2. **Test Simulation (no auth needed):**
   - Click on `POST /api/interventions/demo/simulate`
   - Click "Try it out"
   - Set `user_id` to any UUID like: `123e4567-e89b-12d3-a456-426614174000`
   - Set `num_interventions` to `20`
   - Click "Execute"
   - You'll see simulated experiment results!

3. **Test Insights:**
   - Click on `GET /api/insights`
   - Use the same `user_id` from step 2
   - Click "Execute"
   - You'll see strategy effectiveness data!

---

## Step 8: View Opik Dashboard

1. Go to https://www.comet.com/opik
2. Log in to your account
3. Look for project "resolution-lab"
4. You should see traces appearing from your API calls!

---

## 🎉 Backend is Running!

You now have:
- ✅ FastAPI server running locally
- ✅ Opik tracing working
- ✅ LLM integration (Gemini)
- ✅ Database ready (Supabase)

---

## Troubleshooting

### "Module not found" error
```bash
pip install -r requirements.txt
```

### "OPIK_API_KEY not set" warning
Make sure your `.env` file is in the `backend` folder and has the correct key.

### "Connection refused" to Supabase
Check that your `SUPABASE_URL` doesn't have a trailing slash.

### LLM calls failing
Check your `GOOGLE_API_KEY` is correct. Test it at https://aistudio.google.com/

---

## Next: Build the Frontend

Once backend is working, tell me **"let's build the frontend"** and I'll create the Next.js app!
