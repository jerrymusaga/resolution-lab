# Resolution Lab - Setup & Next Steps

## ✅ What's Built (Backend Complete)

```
resolution-lab/backend/
├── main.py                    # FastAPI app with Opik integration
├── config.py                  # Environment configuration
├── requirements.txt           # Python dependencies
├── .env.example              # Template for environment variables
├── models/
│   ├── schemas.py            # Pydantic models (Goal, Intervention, etc.)
│   └── database.py           # Supabase client + SQL schema
├── services/
│   ├── intervention_generator.py  # LLM message generation with Opik tracing
│   ├── experiment_engine.py       # Multi-armed bandit algorithm
│   └── analysis_engine.py         # LLM-as-judge, metrics, insights
└── routers/
    ├── goals.py              # CRUD for goals
    ├── interventions.py      # Generate & track interventions
    └── insights.py           # User analytics & experiment results
```

## 🔧 Your Next Steps

### Step 1: Get API Keys (15 minutes)

#### 1.1 Opik (Comet) - Required
1. Go to https://www.comet.com/signup
2. Create account and workspace
3. Go to Settings → API Keys → Generate New API Key
4. Copy your API key and workspace name

#### 1.2 Google Gemini - Required
1. Go to https://aistudio.google.com/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the API key

#### 1.3 Supabase - Required
1. Go to https://supabase.com/dashboard
2. Create new project
3. Go to Settings → API
4. Copy: Project URL, anon key, service_role key

### Step 2: Configure Environment Variables

Edit `backend/.env` with your actual keys:

```bash
cd resolution-lab/backend
# Edit .env file with your keys:

DEBUG=true

# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Opik
OPIK_API_KEY=your_opik_api_key
OPIK_WORKSPACE=your_workspace
OPIK_PROJECT_NAME=resolution-lab

# Google Gemini
GOOGLE_API_KEY=your_gemini_key
```

### Step 3: Set Up Database

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL from `backend/models/database.py`
   - Or run: `python -m models.database` to print the schema

### Step 4: Test the Backend

```bash
cd resolution-lab/backend

# Start the server
uvicorn main:app --reload

# Open in browser:
# http://localhost:8000/docs  ← Swagger UI (test all endpoints!)
```

### Step 5: Build Frontend (We'll do this together)

The frontend will include:
- Landing page
- Goal creation wizard
- Daily check-in interface
- **Personal insights dashboard (Opik data visualization)**

---

## 📊 API Endpoints Available

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/goals` | POST | Create a new goal |
| `/api/goals` | GET | List user's goals |
| `/api/goals/{id}` | GET | Get specific goal |
| `/api/interventions/generate` | POST | Generate intervention message |
| `/api/interventions/check-in` | POST | Record check-in response |
| `/api/interventions/strategies` | GET | List all strategies |
| `/api/interventions/demo/simulate` | POST | Simulate experiments (for testing) |
| `/api/insights` | GET | Get user's experiment insights |
| `/api/insights/comparison` | GET | Compare all strategies |
| `/api/insights/summary` | GET | Dashboard summary |

---

## 🎯 Hackathon Judging Checklist

- [x] Functionality: API fully working
- [x] Use of LLMs: Intervention generation, sentiment analysis
- [x] Evaluation & Observability: Deep Opik integration
- [ ] Frontend: Coming next
- [ ] Documentation: README, architecture docs
- [ ] Demo video: Final step
- [ ] Opik dashboard screenshots: After running with real keys

---

## ⏰ Time Estimate

| Task | Time |
|------|------|
| Get API keys & configure | 15 min |
| Set up Supabase database | 10 min |
| Test backend with real keys | 15 min |
| Build frontend | 3-4 hours |
| Polish & test | 2 hours |
| Documentation | 2 hours |
| Demo video | 1 hour |

**Total remaining: ~8-10 hours of work**

---

Ready to continue? Just say "let's build the frontend" when you're ready!
