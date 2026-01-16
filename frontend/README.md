# Resolution Lab - Frontend

A Next.js 14 application with TypeScript and Tailwind CSS.

## Features

- 🎯 **Dashboard** - Overview of goals and experiment progress
- ✅ **Goals Management** - Create, edit, pause, and complete goals  
- 📊 **Insights Dashboard** - View your personal experiment results with charts
- 🧪 **Experiment Simulator** - Try the multi-armed bandit algorithm without real data

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Charts for data visualization
- **Lucide React** - Icons

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend running on http://localhost:8000

### Installation

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

The frontend uses one environment variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

This is already set in `.env.local`. Change it if your backend runs on a different port.

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with header
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/          # Dashboard page
│   │   ├── goals/              # Goals pages
│   │   │   ├── page.tsx        # Goals list
│   │   │   └── new/page.tsx    # New goal form
│   │   ├── insights/           # Insights dashboard
│   │   └── experiment/         # Simulation demo
│   ├── components/             # React components
│   │   ├── ui/                 # Reusable UI components
│   │   ├── Header.tsx          # Navigation header
│   │   ├── GoalCard.tsx        # Goal display card
│   │   ├── StrategyCard.tsx    # Strategy stats card
│   │   └── CheckInModal.tsx    # Check-in modal
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # API client
│   │   └── utils.ts            # Helper functions
│   └── types/                  # TypeScript types
│       └── index.ts            # All type definitions
├── public/                     # Static assets
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Pages

### Landing Page (`/`)
Marketing page explaining what Resolution Lab does.

### Dashboard (`/dashboard`)
Main user dashboard showing:
- Active goals count
- Experiment progress
- Best strategy discovered
- Quick access to goals

### Goals (`/goals`)
List all goals with filtering by status.

### New Goal (`/goals/new`)
Form to create a new goal with suggestions.

### Insights (`/insights`)
**The key feature!** Shows:
- Strategy effectiveness chart
- Ranked strategy cards
- Personal recommendation
- Experiment phase status

### Experiment (`/experiment`)
Simulation demo that runs fake check-ins to show how the algorithm works.

## API Integration

The frontend communicates with the FastAPI backend through `src/lib/api.ts`. 

Key functions:
- `createGoal()` - Create a new goal
- `generateIntervention()` - Get AI-generated motivation message
- `recordCheckIn()` - Record user's check-in response
- `getUserInsights()` - Get experiment results
- `simulateExperiment()` - Run simulation demo

## Styling

Using Tailwind CSS with custom theme extensions for:
- Primary colors (blue-based)
- Success/warning/danger colors
- Custom animations

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Deployment

The app can be deployed to Vercel:

```bash
npm run build
```

Make sure to set `NEXT_PUBLIC_API_URL` to your deployed backend URL.
