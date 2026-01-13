# Resolution Lab 🧪

> An AI-powered behavioral experimentation platform that helps you discover what actually motivates you.

## Overview

**Resolution Lab** is a personalized motivation discovery system that uses multi-armed bandit algorithms and AI to find your unique motivation formula. Instead of generic productivity advice, Resolution Lab runs systematic experiments with 8 different motivational strategies to identify what works best for you.

### How It Works

1. **Set Your Goals** - Define what you want to achieve (exercise, learning, habits, etc.)
2. **Receive Smart Interventions** - Get AI-generated motivational messages using different psychological strategies
3. **Track Your Response** - Check in on your progress and provide feedback
4. **Discover Your Formula** - The system learns which strategies work best for you over time

### The Science

Resolution Lab tests 8 evidence-based motivational strategies:

- **Gentle Reminder** - Warm, encouraging nudges
- **Accountability** - Direct yes/no check-ins
- **Streak Gamification** - Focus on maintaining progress streaks
- **Social Comparison** - Leverage social proof and peer performance
- **Loss Aversion** - Highlight what you might lose by not acting
- **Reward Preview** - Emphasize benefits and positive outcomes
- **Identity Reinforcement** - "Become the person who..."
- **Micro-Commitment** - Lower the barrier with small first steps

Using **multi-armed bandit optimization** (epsilon-greedy algorithm), the system balances exploration (trying different strategies) with exploitation (using what works), continuously adapting to your responses.

---

## Tech Stack

### Backend (Python/FastAPI)
- **FastAPI** - Modern async web framework
- **Supabase** - PostgreSQL database with real-time capabilities
- **LiteLLM** - Unified LLM interface (using Gemini 1.5 Flash)
- **Opik (Comet)** - Experiment tracking and LLM observability
- **AsyncPG** - High-performance async PostgreSQL driver

### Frontend (Coming Soon)
- **Next.js** - React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

---

## Project Structure

```
resolution-lab/
├── backend/
│   ├── main.py                      # FastAPI application entry
│   ├── config.py                    # Environment configuration
│   ├── requirements.txt             # Python dependencies
│   ├── models/
│   │   ├── schemas.py              # Pydantic data models
│   │   └── database.py             # Database schema & client
│   ├── routers/
│   │   ├── goals.py                # Goal management endpoints
│   │   ├── interventions.py        # Intervention generation & tracking
│   │   └── insights.py             # Analytics & recommendations
│   └── services/
│       ├── intervention_generator.py  # LLM-based message generation
│       ├── experiment_engine.py       # Multi-armed bandit algorithm
│       └── analysis_engine.py         # Sentiment & completion analysis
├── frontend/                        # Next.js app (coming soon)
├── docs/                           # Additional documentation
└── scripts/                        # Utility scripts
```

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- Accounts for:
  - [Supabase](https://supabase.com) (free tier)
  - [Comet/Opik](https://comet.com) (free tier)
  - [Google AI Studio](https://aistudio.google.com) (free tier)

### Setup Backend

```bash
# Create virtual environment
python3 -m venv venv

# Activate it (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Configure Environment

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- **Supabase**: Get from [your Supabase dashboard](https://supabase.com/dashboard) → Settings → API
- **Opik**: Get from [Comet settings](https://www.comet.com/account-settings/apiKeys)
- **Google Gemini**: Get from [AI Studio](https://aistudio.google.com/apikey)

### Initialize Database

Run the SQL schema in your Supabase SQL Editor (found in `backend/models/database.py`).

### Start the Server

```bash
uvicorn main:app --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Features

### Core Functionality

- **Goal Management** - Create, track, and manage behavioral goals
- **Smart Interventions** - AI-generated motivational messages tailored to each strategy
- **Multi-Armed Bandit** - Automatically learns which strategies work best for each user
- **Sentiment Analysis** - Analyzes user feedback to understand emotional responses
- **Strategy Insights** - View detailed analytics on strategy effectiveness
- **Full Observability** - All LLM calls traced in Opik for debugging and analysis

### API Endpoints

#### Goals
- `POST /api/goals` - Create a new goal
- `GET /api/goals` - List goals with filtering
- `PATCH /api/goals/{id}` - Update goal
- `DELETE /api/goals/{id}` - Delete goal
- `POST /api/goals/{id}/complete` - Mark as completed

#### Interventions
- `POST /api/interventions/generate` - Generate new intervention
- `POST /api/interventions/check-in` - Record user response
- `GET /api/interventions/history` - View past interventions
- `GET /api/interventions/strategies` - List all strategies

#### Insights
- `GET /api/insights` - Overall user insights
- `GET /api/insights/strategy/{strategy}` - Strategy-specific stats
- `GET /api/insights/comparison` - Compare strategies
- `GET /api/insights/recommendation` - Get AI recommendation

---

## Development

### Project Architecture

The backend follows a clean architecture pattern:

- **Routers** - Handle HTTP requests and responses
- **Services** - Contain business logic
- **Models** - Define data structures and database schema
- **Config** - Manage environment and settings

### Running Tests

```bash
pytest
```

### Code Quality

```bash
# Format code
black .

# Type checking
mypy .

# Linting
ruff check .
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Roadmap

- [x] Backend API with FastAPI
- [x] Multi-armed bandit experiment engine
- [x] LLM integration with Gemini
- [x] Full observability with Opik
- [ ] Frontend with Next.js
- [ ] User authentication
- [ ] Mobile app (React Native)
- [ ] Email/SMS notifications
- [ ] Advanced analytics dashboard
- [ ] Social features & challenges
- [ ] Integration with fitness trackers

---

## Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [Google Gemini](https://ai.google.dev/)
- Tracked with [Opik](https://www.comet.com/opik)
- Database by [Supabase](https://supabase.com)

---

## Contact

For questions or feedback, please open an issue on GitHub.

---

**Made with 🧪 by the Resolution Lab team**
