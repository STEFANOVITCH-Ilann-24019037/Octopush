# Octopush

A GitHub-like platform built with React, FastAPI, and MongoDB.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Tailwind CSS, Radix UI, React Router v7 |
| Backend | FastAPI, Motor (async MongoDB), PyJWT, bcrypt |
| Database | MongoDB |

## Lancer le projet

Dans 3 terminaux séparés :

```bash
# Terminal 1 — MongoDB
brew services start mongodb/brew/mongodb-community

# Terminal 2 — Backend
cd backend && uvicorn server:app --reload --port 8000

# Terminal 3 — Frontend
cd frontend && yarn start
```

Site dispo sur **http://localhost:3000** · Compte de test : `octodev` / `password123`

---

## Getting started

### Prerequisites

- Node.js + Yarn
- Python 3.10+
- MongoDB running locally

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=octopush
JWT_SECRET=your-secret-here
```

Start the server:

```bash
uvicorn server:app --reload --port 8000
```

On first startup, a demo user is auto-seeded: **`octodev` / `password123`**.

### Frontend

```bash
cd frontend
yarn install
```

Create `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

Start the dev server:

```bash
yarn start
```

The app will be available at `http://localhost:3000`.

## Project structure

```
.
├── backend/
│   ├── server.py          # FastAPI app (all routes in one file)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ui/ # Radix UI + Tailwind components (shadcn pattern)
│   │   ├── contexts/      # AuthContext, ThemeContext
│   │   ├── lib/api.js     # Axios instance with auto JWT attach
│   │   └── mock.js        # Mock data (PRs, files, commits — not yet from API)
│   └── package.json
├── contracts.md           # Frontend ↔ Backend API contract
└── backend_test.py        # Integration tests (hits real API)
```

## API

All routes are prefixed with `/api`.

| Route | Description |
|---|---|
| `POST /api/auth/signup` | Register |
| `POST /api/auth/login` | Login, returns JWT |
| `GET /api/auth/me` | Current user |
| `GET /api/users/:username` | User profile |
| `GET /api/users/:username/repos` | User repositories |
| `POST /api/users/:username/follow` | Follow a user |
| `GET /api/repos/trending` | Trending repositories |
| `GET /api/repos/:owner/:name` | Repository details |
| `POST /api/repos` | Create repository |
| `POST /api/repos/:owner/:name/star` | Star a repository |
| `GET /api/repos/:owner/:name/issues` | List issues |
| `POST /api/repos/:owner/:name/issues` | Create issue |
| `GET /api/feed` | Activity feed (auth required) |

See `contracts.md` for full request/response shapes.

## Running tests

```bash
# Update BASE_URL in backend_test.py first, then:
python backend_test.py
```
