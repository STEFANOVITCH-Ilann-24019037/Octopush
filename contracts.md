# Octopush - Contracts (Frontend ↔ Backend)

Brand: **Octopush** 🐙 — accent color = **orange** (#f97316 / hsl(24 95% 53%)).

## 1. Auth (JWT)
- POST `/api/auth/signup` body `{username, email, password}` → `{token, user}`
- POST `/api/auth/login` body `{identifier, password}` (username or email) → `{token, user}`
- GET `/api/auth/me` (Bearer) → `user`

User shape:
```
{id, username, name, email, bio, avatar, company, location, website, followers, following, created_at}
```

## 2. Users
- GET `/api/users/{username}` → user + counts (`repos_count`, `followers`, `following`)
- PATCH `/api/users/me` (Bearer) → update profile
- POST `/api/users/{username}/follow` / DELETE same → follow/unfollow
- GET `/api/users/{username}/repos` → list repos visible to caller

## 3. Repositories
- POST `/api/repos` (Bearer) body `{name, description, visibility, init_readme}` → repo
- GET `/api/repos/{owner}/{name}` → repo (404 if private and not owner)
- PATCH `/api/repos/{owner}/{name}` (Bearer, owner) → update
- DELETE `/api/repos/{owner}/{name}` (Bearer, owner)
- POST `/api/repos/{owner}/{name}/star` / DELETE → star/unstar (returns `{stars}`)
- GET `/api/repos/trending` → list (sorted by stars desc, last 30d)

Repo shape:
```
{id, owner, name, description, visibility, language, language_color, stars, forks,
 watchers, topics[], branch, readme, is_starred, updated_at, created_at}
```

## 4. Issues
- GET `/api/repos/{owner}/{name}/issues?state=open|closed` → list
- POST `/api/repos/{owner}/{name}/issues` (Bearer) body `{title, body, labels[]}` → issue
- PATCH `/api/repos/{owner}/{name}/issues/{number}` (Bearer) → update state/labels

## 5. Feed
- GET `/api/feed` (Bearer) → recent activity items from followed users

## 6. Frontend mock replacement
The following mock.js exports will be replaced by real API:
- `MOCK_CURRENT_USER` → `/api/auth/me`
- `MOCK_REPOS` → `/api/users/{username}/repos`
- `MOCK_TRENDING` → `/api/repos/trending`
- `MOCK_FEED` → `/api/feed`
- `MOCK_ISSUES` → `/api/repos/{o}/{n}/issues`
- `MOCK_PULL_REQUESTS`, `MOCK_FILES`, `MOCK_README`, `MOCK_CODE_SAMPLE`, `MOCK_COMMITS` → remain mocked for v1 (UI sugar)

## 7. Storage
MongoDB collections: `users`, `repos`, `issues`, `stars`, `follows`.
All ids are UUID v4 strings (no Mongo ObjectId in responses).

## 8. Auth header
Frontend stores `token` in `localStorage.octopush_token`. Axios instance adds `Authorization: Bearer <token>` automatically.

## 9. Seed
On first backend boot, if `users` collection is empty, seed demo user `octodev` (password `password123`) with 4 public repos + 1 private and a few issues to make UI feel alive.
