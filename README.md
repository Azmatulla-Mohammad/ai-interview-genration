# AI Interview Coach

AI Interview Coach is a full-stack mock interview practice platform built with `FastAPI`, `React`, `PostgreSQL`, and `Google Gemini`.

It helps users:

- create an account and sign in
- generate interview questions by role and difficulty
- answer questions one by one in a guided interview flow
- get AI evaluation with score, feedback, missing points, and an ideal answer
- review history and retake older questions
- track progress with analytics

This version is a clean rebuild of the original Java project into a simpler and easier-to-maintain stack.

## Table of Contents

- Overview
- Product Flow
- Tech Stack
- Project Structure
- Features
- How It Works
- Prerequisites
- Environment Variables
- Quick Start
- Database Setup
- Gemini Setup
- Running the Project
- Testing
- API Overview
- Deployment Notes
- Troubleshooting
- Security Notes

## Overview

The project is split into two main parts:

- `backend`: FastAPI application with auth, question generation, answer evaluation, history, and analytics APIs
- `frontend`: React + Vite single-page app with a full interview session UI

The backend stores users, questions, answers, and evaluations in PostgreSQL. Questions are grouped by a `batch_id` so a full generated interview set can be tracked as one session.

If `GEMINI_API_KEY` is not configured, the backend falls back to simple local development logic so the app can still run.

## Product Flow

The intended user flow is:

1. Register or log in
2. Choose job role, difficulty, and number of questions
3. Generate a fresh interview session
4. Start at question 1
5. Submit an answer
6. Review the AI evaluation
7. Move to the next question
8. Finish the session and review history and analytics

## Tech Stack

### Backend

- `FastAPI`
- `SQLAlchemy 2`
- `psycopg 3`
- `Pydantic Settings`
- `python-jose` for JWT
- `Google Gemini` via `google-genai`

### Frontend

- `React 18`
- `React Router`
- `Vite`
- custom CSS for the UI and animations

### Database

- `PostgreSQL`
- recommended hosted option: `Supabase`
- local PostgreSQL also works

## Project Structure

```text
ai-interview-bot/
  backend/
    app/
      api/
        routes/
      core/
      models/
      schemas/
      services/
      main.py
    tests/
    .env.example
    requirements.txt
  frontend/
    src/
      components/
      context/
      lib/
      pages/
      App.jsx
      main.jsx
      styles.css
    .env.example
    package.json
    vite.config.js
  .gitignore
  README.md
```

## Features

- Email/password registration and login
- JWT-based authentication
- Persistent frontend session using `localStorage`
- Question generation by:
  - job role
  - difficulty
  - question count
- Sequential interview mode:
  - question 1
  - submit answer
  - review result
  - next question
- AI evaluation fields:
  - score
  - feedback
  - missing points
  - ideal answer
- History filtering by:
  - role
  - difficulty
  - min score
  - max score
- Analytics with:
  - total attempts
  - average score
  - top score
  - lowest score
  - difficulty breakdown
  - timeline
- Responsive full-screen style UI with interview-session mood

## How It Works

### Backend flow

1. User authenticates and receives a JWT token.
2. Frontend sends authenticated requests using `Authorization: Bearer <token>`.
3. The question generation endpoint creates a new `batch_id`.
4. Generated questions are stored in the database under that batch.
5. User submits answers one by one.
6. The backend evaluates the answer using Gemini or fallback logic.
7. Answer and evaluation are saved separately.
8. History and analytics are calculated per logged-in user.

### Frontend flow

1. React app loads and checks the saved token.
2. If a token exists, `/api/auth/me` loads the current user.
3. Protected pages are only available when authenticated.
4. The interview pages preserve `batchId`, `jobRole`, `difficulty`, and `pageSize` in the route query string.
5. After every answer, the result page offers the next question in the session.

## Prerequisites

Install these before running the project:

- `Python 3.11+` or `Python 3.12`
- `Node.js 18+`
- `npm`
- `PostgreSQL` account or local server
- optional but recommended: `Google AI Studio / Gemini API key`

## Environment Variables

### Backend

Backend settings are loaded from `backend/.env`.

Use `backend/.env.example` as the template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_NAME` | No | Application name shown by FastAPI |
| `APP_ENV` | No | Environment name such as `development` |
| `DATABASE_URL` | Yes | SQLAlchemy database connection string |
| `FRONTEND_URL` | Yes | Frontend origin allowed by CORS |
| `JWT_SECRET_KEY` | Yes | Secret used to sign JWT tokens |
| `JWT_EXPIRE_MINUTES` | No | Token expiry in minutes |
| `GEMINI_API_KEY` | Recommended | Enables real Gemini generation and evaluation |
| `GEMINI_MODEL` | No | Gemini model name, default is `gemini-2.5-flash-lite` |
| `QUESTION_BATCH_SIZE` | No | Default question batch size value |

Example:

```env
APP_NAME=AI Interview Coach
APP_ENV=development
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/ai_interview_bot
FRONTEND_URL=http://localhost:5173
JWT_SECRET_KEY=change-this-to-a-long-random-secret
JWT_EXPIRE_MINUTES=1440
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
QUESTION_BATCH_SIZE=5
```

### Frontend

Frontend settings are loaded from `frontend/.env`.

Use `frontend/.env.example` as the template.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Base URL for the backend API |

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Quick Start

### 1. Clone or open the project

```powershell
cd path\to\ai-interview-bot
```

### 2. Create backend environment file

```powershell
Copy-Item backend\.env.example backend\.env
```

Update the real values in `backend/.env`.

### 3. Create frontend environment file

```powershell
Copy-Item frontend\.env.example frontend\.env
```

### 4. Create Python virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

### 5. Install backend dependencies

```powershell
pip install -r backend\requirements.txt
```

### 6. Install frontend dependencies

```powershell
cd frontend
cmd /c npm.cmd install
cd ..
```

### 7. Run the backend

```powershell
.\start-backend.cmd
```

Backend URL:

- `http://127.0.0.1:8000`
- health check: `http://127.0.0.1:8000/health`
- API docs: `http://127.0.0.1:8000/docs`

### 8. Run the frontend

Open a second terminal:

```powershell
.\start-frontend.cmd
```

Frontend URL:

- `http://127.0.0.1:5173`

## Database Setup

### Recommended cloud database: Supabase

Supabase works well with this app when you deploy the app on Render and keep Postgres in Supabase.

### Supabase steps

1. Create a Supabase project.
2. Open the database connection settings in the Supabase dashboard.
3. Copy the `Supavisor session mode` connection string.
4. Put it in `backend/.env` as `DATABASE_URL`.

The backend accepts any of these prefixes and normalizes them for SQLAlchemy automatically:

- `postgres://`
- `postgresql://`
- `postgresql+psycopg://`

Example:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:YOUR_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
```

### Local PostgreSQL

If you prefer local PostgreSQL:

1. Create a database named `ai_interview_bot`
2. Confirm your username and password
3. Use a connection string like:

```env
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/ai_interview_bot
```

### Important note

The app auto-creates tables on startup through SQLAlchemy metadata. There is no Alembic migration setup in this version.

## Gemini Setup

To use real AI responses:

1. Create a Gemini API key in Google AI Studio
2. Put the key in `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
```

3. Restart the backend

Default model:

```env
GEMINI_MODEL=gemini-2.5-flash-lite
```

If `GEMINI_API_KEY` is empty:

- the project still runs
- question generation and evaluation use fallback development logic

## Running the Project

### Backend commands

Start development server:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend
```

### Frontend commands

Development server:

```powershell
cd frontend
cmd /c npm.cmd run dev
```

Production build:

```powershell
cd frontend
cmd /c npm.cmd run build
```

Preview production build:

```powershell
cd frontend
cmd /c npm.cmd run preview
```

## Testing

Backend test command:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

What the current backend integration test covers:

- user registration
- duplicate registration rejection
- login
- current user lookup
- question generation
- question listing by batch
- answer submission
- evaluation creation
- history retrieval
- analytics retrieval

Frontend verification command:

```powershell
cd frontend
cmd /c npm.cmd run build
```

## API Overview

Base prefix:

```text
/api
```

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Interview

- `POST /api/questions/generate`
- `GET /api/questions`
- `GET /api/questions/{question_id}`
- `POST /api/evaluations`
- `GET /api/evaluations/{evaluation_id}`
- `GET /api/history`
- `GET /api/analytics`

### Example request: generate questions

```json
{
  "job_role": "Python Developer",
  "difficulty": "Medium",
  "question_count": 5
}
```

### Example request: submit answer

```json
{
  "question_id": 1,
  "user_answer": "I would explain the concept, the tradeoffs, and one production example."
}
```

### Auth format

Protected routes require:

```text
Authorization: Bearer <jwt_token>
```

## Frontend Pages

Public pages:

- `/`
- `/login`
- `/register`

Protected pages:

- `/dashboard`
- `/generate`
- `/questions`
- `/questions/:questionId`
- `/results/:evaluationId`
- `/history`
- `/analytics`

## Deployment Notes

Recommended production deployment:

- frontend: Render web service
- backend: Render web service
- database: Supabase Postgres

### Deploy Everything on Render

This repository includes a root-level `render.yaml` Blueprint for a full Render deployment:

- `ai-interview-coach-api`: FastAPI backend
- `ai-interview-coach-web`: frontend web service that serves the Vite build

1. Push this repo to GitHub.
2. In Render, choose **New +** -> **Blueprint**.
3. Connect this GitHub repository.
4. Render will detect `render.yaml` and propose the backend and frontend services.
5. When Render prompts for environment values, paste your Supabase `Supavisor session mode` connection string into `DATABASE_URL`.
6. Set frontend `VITE_API_BASE_URL` to your backend API URL, for example `https://ai-interview-coach-api.onrender.com/api`.
7. Provide `GEMINI_API_KEY` if you want Gemini enabled.
8. Create the Blueprint and wait for the initial deploy to finish.

### How This Render Setup Works

- The frontend service builds the Vite app and serves it from a small Node server.
- The browser calls the backend API directly using `VITE_API_BASE_URL`.
- The frontend web service only serves the built SPA.
- The backend receives its `DATABASE_URL` from Render environment variables.
- You should supply the Supabase `Supavisor session mode` connection string for Render deployments.
- The backend accepts `postgres://`, `postgresql://`, or `postgresql+psycopg://` and normalizes them automatically for SQLAlchemy's `psycopg` driver.

### After Deploy

Verify these URLs:

```text
https://ai-interview-coach-web.onrender.com
https://ai-interview-coach-api.onrender.com/health
https://ai-interview-coach-api.onrender.com/ready
```

If Render assigns a different frontend subdomain than `https://ai-interview-coach-web.onrender.com`, update the backend service's `FRONTEND_URL` environment variable in the Render Dashboard and redeploy the backend once.

### Render deployment checklist

- confirm the frontend service is live and serving the SPA routes
- confirm `/health` returns database and configuration details
- confirm `/ready` returns `ready` after the database is connected
- confirm `DATABASE_URL` in Render points to the Supabase session pooler
- confirm frontend `VITE_API_BASE_URL` points to the backend Render API URL
- keep `JWT_SECRET_KEY` generated by Render
- add `GEMINI_API_KEY` if you want remote Gemini responses instead of local fallbacks

## Troubleshooting

### Backend says password authentication failed

Your `DATABASE_URL` is wrong for the current database user/password.

Check:

- username
- password
- host
- port
- database name

### Backend still points to localhost instead of Supabase

Make sure:

- `backend/.env` exists
- `DATABASE_URL` is set there
- the value is your Supabase session pooler URL
- you restarted the backend after editing `.env`

### Frontend cannot talk to backend

Check:

- backend is running on `127.0.0.1:8000`
- frontend `VITE_API_BASE_URL` is correct
- CORS `FRONTEND_URL` matches your frontend origin

### Gemini responses are not working

Check:

- `GEMINI_API_KEY` is valid
- backend was restarted after updating `.env`
- network access is available from the backend machine

If the key is missing, the app will fall back to local logic instead of failing completely.

### UI changes do not appear

Try:

- restarting `npm run dev`
- hard refreshing the browser
- clearing cached Vite output by restarting the dev server

## Security Notes

- Never commit `backend/.env` or `frontend/.env`
- Rotate any API key or database password that has been shared publicly
- Use a strong `JWT_SECRET_KEY` in any real environment
- Do not use the development defaults in production

## Current Development Status

The project currently includes:

- full backend API
- React frontend with interview session flow
- sequential question navigation
- history and analytics pages
- automated backend integration test
- production frontend build verification

## Recommended Next Improvements

- add Alembic migrations
- add backend unit tests for services and auth helpers
- add frontend component tests
- add loading skeletons and empty states for every page
- add Docker support for one-command local setup
- add CI for backend tests and frontend build

## License

This project currently does not include a separate license file.
