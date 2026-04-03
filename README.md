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
- recommended hosted option: `Neon`
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
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend
```

Backend URL:

- `http://127.0.0.1:8000`
- health check: `http://127.0.0.1:8000/health`
- API docs: `http://127.0.0.1:8000/docs`

### 8. Run the frontend

Open a second terminal:

```powershell
cd frontend
cmd /c npm.cmd run dev
```

Frontend URL:

- `http://127.0.0.1:5173`

## Database Setup

### Recommended: Neon

Neon is recommended because it is easier to deploy and avoids local PostgreSQL configuration issues.

### Neon steps

1. Create a Neon project.
2. Create or use a permanent branch such as `production`.
3. Copy the Postgres connection string.
4. Convert the prefix from:

```text
postgresql://
```

to:

```text
postgresql+psycopg://
```

5. Put it in `backend/.env` as `DATABASE_URL`.

Example:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST/neondb?sslmode=require
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

Recommended deployment split:

- backend: Render, Railway, Fly.io, or any Python host
- frontend: Vercel, Netlify, or static hosting
- database: Neon

### Deploy Backend on Render

This repository no longer uses a Render blueprint file, so create the backend service manually.

1. Push this repo to GitHub.
2. In Render, choose **New +** -> **Web Service**.
3. Connect this GitHub repository.
4. Configure the service:

- Root Directory: `backend`
- Runtime: `Python`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`

5. Set these required secret environment values in Render:

- `DATABASE_URL` (use your Neon URL with `postgresql+psycopg://`)
- `JWT_SECRET_KEY` (long random secret)
- `FRONTEND_URL` (your Vercel app URL)
- `GEMINI_API_KEY` (optional but recommended)

6. Deploy and wait for build completion.
7. Verify backend health at:

```text
https://<your-render-service>.onrender.com/health
```

8. Your API base URL will be:

```text
https://<your-render-service>.onrender.com/api
```

### Deploy Frontend on Vercel

The frontend includes `frontend/vercel.json` for SPA routing.

1. In Vercel, import this GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: `Vite`.
4. Add environment variable:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`

5. Deploy.
6. Copy your Vercel URL (for example `https://your-app.vercel.app`).
7. Update Render `FRONTEND_URL` with that exact Vercel URL and redeploy backend once.

### Deployment Order

Use this order to avoid CORS issues:

1. Deploy backend on Render and get backend URL.
2. Deploy frontend on Vercel using that backend URL.
3. Copy final Vercel URL into backend `FRONTEND_URL`.
4. Redeploy backend.

### Backend deployment checklist

- set all backend environment variables
- use the production database URL
- set `FRONTEND_URL` to the deployed frontend domain
- keep `JWT_SECRET_KEY` strong and private
- confirm the backend can reach the Postgres database

### Frontend deployment checklist

- set `VITE_API_BASE_URL` to the deployed backend API URL
- make sure the backend CORS settings include the frontend domain

## Troubleshooting

### Backend says password authentication failed

Your `DATABASE_URL` is wrong for the current database user/password.

Check:

- username
- password
- host
- port
- database name

### Backend still points to localhost instead of Neon

Make sure:

- `backend/.env` exists
- `DATABASE_URL` is set there
- the prefix is `postgresql+psycopg://`
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
