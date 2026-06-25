import os
import re
import uuid
import shutil
import asyncio
import base64
import tempfile
import subprocess as _sync_subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from starlette.responses import Response

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 30

# ---------- Git storage ----------
REPO_ROOT = ROOT_DIR / 'repositories'
REPO_ROOT.mkdir(exist_ok=True)

_GIT_EXEC_PATH = _sync_subprocess.run(
    ['git', '--exec-path'], capture_output=True, text=True
).stdout.strip()
GIT_HTTP_BACKEND = str(Path(_GIT_EXEC_PATH) / 'git-http-backend')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title='Octopush API')
api = APIRouter(prefix='/api')

# ---------- Helpers ----------
LANGUAGE_COLORS = {
    'JavaScript': '#f1e05a', 'TypeScript': '#3178c6', 'Python': '#3572A5',
    'Rust': '#dea584', 'Go': '#00ADD8', 'Shell': '#89e051', 'HTML': '#e34c26',
    'CSS': '#563d7c', 'Markdown': '#083fa1', 'Java': '#b07219', 'C++': '#f34b7d',
}

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'iat': datetime.now(tz=timezone.utc),
        'exp': datetime.now(tz=timezone.utc) + timedelta(days=JWT_EXP_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return data.get('sub')
    except Exception:
        return None

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Not authenticated')
    user_id = decode_token(authorization.split(' ', 1)[1])
    if not user_id:
        raise HTTPException(status_code=401, detail='Invalid token')
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user

async def get_optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        return None
    user_id = decode_token(authorization.split(' ', 1)[1])
    if not user_id:
        return None
    return await db.users.find_one({'id': user_id})

def _user_public(u: dict) -> dict:
    return {
        'id': u['id'],
        'username': u['username'],
        'name': u.get('name', u['username']),
        'email': u.get('email'),
        'bio': u.get('bio', ''),
        'avatar': u.get('avatar') or f"https://api.dicebear.com/9.x/identicon/svg?seed={u['username']}",
        'company': u.get('company', ''),
        'location': u.get('location', ''),
        'website': u.get('website', ''),
        'created_at': u.get('created_at'),
    }

async def _repo_to_public(r: dict, viewer: Optional[dict]) -> dict:
    is_starred = False
    if viewer:
        s = await db.stars.find_one({'user_id': viewer['id'], 'repo_id': r['id']})
        is_starred = s is not None
    return {
        'id': r['id'],
        'owner': r['owner'],
        'name': r['name'],
        'description': r.get('description', ''),
        'visibility': r.get('visibility', 'Public'),
        'language': r.get('language', 'Markdown'),
        'language_color': LANGUAGE_COLORS.get(r.get('language', 'Markdown'), '#888'),
        'stars': r.get('stars', 0),
        'forks': r.get('forks', 0),
        'watchers': r.get('watchers', 1),
        'topics': r.get('topics', []),
        'branch': r.get('branch', 'main'),
        'readme': r.get('readme', ''),
        'is_starred': is_starred,
        'is_pinned': r.get('is_pinned', False),
        'updated_at': r.get('updated_at'),
        'created_at': r.get('created_at'),
    }

# ---------- Git bare-repo helpers (sync — called from executor or startup) ----------
_SAFE_NAME = re.compile(r'^[A-Za-z0-9_.\-]+$')
_SAFE_BLOB_PATH = re.compile(r'^[A-Za-z0-9/._\-]+$')

_LANG_MAP: dict[str, tuple[str, str]] = {
    '.ts': ('TypeScript', '#3178c6'), '.tsx': ('TypeScript', '#3178c6'),
    '.js': ('JavaScript', '#f1e05a'), '.jsx': ('JavaScript', '#f1e05a'), '.mjs': ('JavaScript', '#f1e05a'),
    '.py': ('Python', '#3572A5'), '.pyi': ('Python', '#3572A5'),
    '.go': ('Go', '#00ADD8'),
    '.rs': ('Rust', '#dea584'),
    '.sh': ('Shell', '#89e051'), '.bash': ('Shell', '#89e051'), '.zsh': ('Shell', '#89e051'),
    '.html': ('HTML', '#e34c26'), '.htm': ('HTML', '#e34c26'),
    '.css': ('CSS', '#563d7c'), '.scss': ('SCSS', '#c6538c'), '.sass': ('SCSS', '#c6538c'),
    '.md': ('Markdown', '#083fa1'), '.mdx': ('Markdown', '#083fa1'),
    '.json': ('JSON', '#292929'), '.yaml': ('YAML', '#cb171e'), '.yml': ('YAML', '#cb171e'),
    '.lua': ('Lua', '#000080'),
    '.c': ('C', '#555555'), '.h': ('C', '#555555'),
    '.cpp': ('C++', '#f34b7d'), '.cc': ('C++', '#f34b7d'), '.hpp': ('C++', '#f34b7d'),
    '.java': ('Java', '#b07219'), '.kt': ('Kotlin', '#A97BFF'), '.swift': ('Swift', '#F05138'),
    '.rb': ('Ruby', '#701516'), '.php': ('PHP', '#4F5D95'),
    '.tf': ('HCL', '#7B42BC'), '.dockerfile': ('Dockerfile', '#384d54'),
    '.vim': ('Vim script', '#199f4b'), '.el': ('Emacs Lisp', '#c065db'),
    '.r': ('R', '#198CE7'), '.jl': ('Julia', '#a270ba'),
    '.ex': ('Elixir', '#6e4a7e'), '.exs': ('Elixir', '#6e4a7e'),
    '.cs': ('C#', '#178600'), '.fs': ('F#', '#b845fc'),
}

def _validate_repo_names(owner: str, name: str) -> bool:
    for part in (owner, name):
        if not part or not _SAFE_NAME.match(part) or '..' in part:
            return False
    try:
        candidate = (REPO_ROOT / owner / (name + '.git')).resolve()
        candidate.relative_to(REPO_ROOT.resolve())
        return True
    except ValueError:
        return False

def init_bare_repo(owner: str, name: str, visibility: str = 'Public') -> None:
    bare = REPO_ROOT / owner / (name + '.git')
    if bare.exists():
        return
    bare.parent.mkdir(parents=True, exist_ok=True)
    _sync_subprocess.run(
        ['git', 'init', '--bare', '-b', 'main', str(bare)],
        check=True, capture_output=True,
    )
    _sync_subprocess.run(
        ['git', 'config', 'http.receivepack', 'true'],
        cwd=str(bare), capture_output=True,
    )
    if visibility == 'Public':
        (bare / 'git-daemon-export-ok').touch()

def _seed_initial_commit(bare: Path, files: dict, message: str = 'Initial commit') -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        work = Path(tmpdir) / 'work'
        work.mkdir()
        _sync_subprocess.run(['git', 'init', '-b', 'main', str(work)], capture_output=True)
        _sync_subprocess.run(['git', 'config', 'user.email', 'seed@octopush.dev'],
                             cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'config', 'user.name', 'Octopush'],
                             cwd=str(work), capture_output=True)
        for relpath, content in files.items():
            fpath = work / relpath
            fpath.parent.mkdir(parents=True, exist_ok=True)
            fpath.write_text(content, encoding='utf-8')
        _sync_subprocess.run(['git', 'add', '.'], cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'commit', '-m', message], cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'remote', 'add', 'origin', str(bare)],
                             cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'push', 'origin', 'main'],
                             cwd=str(work), check=True, capture_output=True)

def _push_extra_commit(bare: Path, filename: str, content: str, message: str) -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        work = Path(tmpdir) / 'work'
        _sync_subprocess.run(['git', 'clone', str(bare), str(work)], capture_output=True)
        if not work.exists():
            return
        _sync_subprocess.run(['git', 'config', 'user.email', 'seed@octopush.dev'],
                             cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'config', 'user.name', 'Octopush'],
                             cwd=str(work), capture_output=True)
        fpath = work / filename
        fpath.parent.mkdir(parents=True, exist_ok=True)
        fpath.write_text(content, encoding='utf-8')
        _sync_subprocess.run(['git', 'add', filename], cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'commit', '-m', message], cwd=str(work), capture_output=True)
        _sync_subprocess.run(['git', 'push', 'origin', 'main'], cwd=str(work), capture_output=True)

def _parse_basic_auth(authorization: Optional[str]) -> Optional[tuple]:
    if not authorization or not authorization.startswith('Basic '):
        return None
    try:
        decoded = base64.b64decode(authorization[6:]).decode('utf-8', errors='replace')
        username, _, password = decoded.partition(':')
        return (username, password) if username else None
    except Exception:
        return None

# ---------- Async git helpers ----------
async def _run_git(args: list, cwd: Path) -> tuple:
    proc = await asyncio.create_subprocess_exec(
        *args,
        cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=15)
    return proc.returncode, stdout.decode('utf-8', errors='replace')

def _humanize_date(iso_str: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_str)
        diff = datetime.now(tz=timezone.utc) - dt.astimezone(timezone.utc)
        secs = int(diff.total_seconds())
        if secs < 60:    return 'just now'
        if secs < 3600:  return f'{secs // 60} minutes ago'
        if secs < 86400: return f'{secs // 3600} hours ago'
        if secs < 604800: return f'{secs // 86400} days ago'
        if secs < 2592000: return f'{secs // 604800} weeks ago'
        if secs < 31536000: return f'{secs // 2592000} months ago'
        return f'{secs // 31536000} years ago'
    except Exception:
        return iso_str

# ---------- Schemas ----------
class SignupIn(BaseModel):
    username: str = Field(min_length=2, max_length=39)
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None

class LoginIn(BaseModel):
    identifier: str
    password: str

class UpdateMeIn(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    avatar: Optional[str] = None

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

class RepoIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = ''
    visibility: str = 'Public'
    language: Optional[str] = 'Markdown'
    topics: Optional[List[str]] = []
    init_readme: Optional[bool] = True
    readme: Optional[str] = None

class RepoUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    website: Optional[str] = None
    visibility: Optional[str] = None
    language: Optional[str] = None
    topics: Optional[List[str]] = None
    readme: Optional[str] = None

class IssueIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    body: Optional[str] = ''
    labels: Optional[List[dict]] = []

class IssueUpdate(BaseModel):
    state: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    labels: Optional[List[dict]] = None

class PRIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    body: Optional[str] = ''
    head: str
    base: str = 'main'

class PRUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    state: Optional[str] = None  # open | closed | merged

# ---------- Auth routes ----------
@api.post('/auth/signup')
async def signup(payload: SignupIn):
    uname = payload.username.strip().lower()
    if not uname.replace('-', '').replace('_', '').isalnum():
        raise HTTPException(400, 'Username can only contain letters, numbers, dashes, underscores')
    if await db.users.find_one({'username': uname}):
        raise HTTPException(409, 'Username already taken')
    if await db.users.find_one({'email': payload.email.lower()}):
        raise HTTPException(409, 'Email already registered')
    user = {
        'id': str(uuid.uuid4()),
        'username': uname,
        'email': payload.email.lower(),
        'password_hash': hash_pw(payload.password),
        'name': payload.name or uname,
        'bio': '',
        'avatar': f'https://api.dicebear.com/9.x/identicon/svg?seed={uname}',
        'company': '',
        'location': '',
        'website': '',
        'created_at': datetime.now(tz=timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user['id'])
    return {'token': token, 'user': _user_public(user)}

@api.post('/auth/login')
async def login(payload: LoginIn):
    ident = payload.identifier.strip().lower()
    user = await db.users.find_one({'$or': [{'username': ident}, {'email': ident}]})
    if not user or not verify_pw(payload.password, user['password_hash']):
        raise HTTPException(401, 'Invalid credentials')
    return {'token': create_token(user['id']), 'user': _user_public(user)}

@api.get('/auth/me')
async def me(user=Depends(get_current_user)):
    return _user_public(user)

# ---------- User routes ----------
@api.get('/users/{username}')
async def get_user(username: str, viewer=Depends(get_optional_user)):
    user = await db.users.find_one({'username': username.lower()})
    if not user:
        raise HTTPException(404, 'User not found')
    followers = await db.follows.count_documents({'target_id': user['id']})
    following = await db.follows.count_documents({'follower_id': user['id']})
    is_following = False
    if viewer:
        is_following = await db.follows.find_one({'follower_id': viewer['id'], 'target_id': user['id']}) is not None
    base = _user_public(user)
    base.update({'followers': followers, 'following': following, 'is_following': is_following})
    return base

@api.patch('/users/me')
async def update_me(payload: UpdateMeIn, user=Depends(get_current_user)):
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    if patch:
        await db.users.update_one({'id': user['id']}, {'$set': patch})
    fresh = await db.users.find_one({'id': user['id']})
    return _user_public(fresh)

@api.post('/users/me/password')
async def change_password(payload: ChangePasswordIn, user=Depends(get_current_user)):
    if not verify_pw(payload.current_password, user['password_hash']):
        raise HTTPException(401, 'Current password is incorrect')
    await db.users.update_one({'id': user['id']}, {'$set': {'password_hash': hash_pw(payload.new_password)}})
    return {'ok': True}

@api.delete('/users/me')
async def delete_account(user=Depends(get_current_user)):
    await db.repos.delete_many({'owner_id': user['id']})
    await db.issues.delete_many({})  # cascade via repo_id is fine here
    await db.stars.delete_many({'user_id': user['id']})
    await db.follows.delete_many({'$or': [{'follower_id': user['id']}, {'target_id': user['id']}]})
    await db.users.delete_one({'id': user['id']})
    return {'ok': True}

@api.post('/users/{username}/follow')
async def follow_user(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({'username': username.lower()})
    if not target:
        raise HTTPException(404, 'User not found')
    if target['id'] == user['id']:
        raise HTTPException(400, "Can't follow yourself")
    await db.follows.update_one(
        {'follower_id': user['id'], 'target_id': target['id']},
        {'$setOnInsert': {'follower_id': user['id'], 'target_id': target['id'], 'created_at': datetime.now(tz=timezone.utc).isoformat()}},
        upsert=True,
    )
    return {'ok': True}

@api.delete('/users/{username}/follow')
async def unfollow_user(username: str, user=Depends(get_current_user)):
    target = await db.users.find_one({'username': username.lower()})
    if not target:
        raise HTTPException(404, 'User not found')
    await db.follows.delete_one({'follower_id': user['id'], 'target_id': target['id']})
    return {'ok': True}

@api.get('/users/{username}/repos')
async def list_user_repos(username: str, viewer=Depends(get_optional_user)):
    owner = await db.users.find_one({'username': username.lower()})
    if not owner:
        raise HTTPException(404, 'User not found')
    query = {'owner': owner['username']}
    if not viewer or viewer['id'] != owner['id']:
        query['visibility'] = 'Public'
    repos = await db.repos.find(query).sort('updated_at', -1).to_list(200)
    return [await _repo_to_public(r, viewer) for r in repos]

# ---------- Repo routes ----------
@api.post('/repos')
async def create_repo(payload: RepoIn, user=Depends(get_current_user)):
    name = payload.name.strip().replace(' ', '-')
    if not name.replace('-', '').replace('_', '').replace('.', '').isalnum():
        raise HTTPException(400, 'Invalid repository name')
    if await db.repos.find_one({'owner': user['username'], 'name': name}):
        raise HTTPException(409, 'Repository already exists')
    readme = payload.readme if payload.readme is not None else (
        f"# {name}\n\n{payload.description or 'A new project on Octopush.'}\n" if payload.init_readme else ''
    )
    now = datetime.now(tz=timezone.utc).isoformat()
    visibility = payload.visibility if payload.visibility in ('Public', 'Private') else 'Public'
    repo = {
        'id': str(uuid.uuid4()),
        'owner': user['username'],
        'owner_id': user['id'],
        'name': name,
        'description': payload.description or '',
        'visibility': visibility,
        'language': payload.language or 'Markdown',
        'topics': payload.topics or [],
        'branch': 'main',
        'readme': readme,
        'stars': 0, 'forks': 0, 'watchers': 1,
        'is_pinned': False,
        'created_at': now, 'updated_at': now,
    }
    await db.repos.insert_one(repo)
    # Init bare git repo on disk (non-blocking, non-fatal)
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, init_bare_repo, user['username'], name, visibility)
        if readme:
            bare = REPO_ROOT / user['username'] / (name + '.git')
            await loop.run_in_executor(
                None, _seed_initial_commit, bare, {'README.md': readme}, 'Initial commit'
            )
    except Exception:
        pass
    return await _repo_to_public(repo, user)

@api.get('/repos/trending')
async def trending(viewer=Depends(get_optional_user)):
    repos = await db.repos.find({'visibility': 'Public'}).sort('stars', -1).limit(10).to_list(10)
    return [await _repo_to_public(r, viewer) for r in repos]

@api.get('/repos/{owner}/{name}')
async def get_repo(owner: str, name: str, viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    return await _repo_to_public(repo, viewer)

@api.patch('/repos/{owner}/{name}')
async def update_repo(owner: str, name: str, payload: RepoUpdate, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo or repo['owner_id'] != user['id']:
        raise HTTPException(404, 'Repository not found')
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    # Handle rename: validate new name, check no conflict, rename bare repo dir
    new_name = patch.get('name')
    if new_name and new_name != repo['name']:
        if not _SAFE_NAME.match(new_name) or '..' in new_name:
            raise HTTPException(400, 'Invalid repository name')
        conflict = await db.repos.find_one({'owner': owner.lower(), 'name': new_name})
        if conflict:
            raise HTTPException(409, 'Repository name already taken')
        old_bare = REPO_ROOT / owner.lower() / (repo['name'] + '.git')
        new_bare = REPO_ROOT / owner.lower() / (new_name + '.git')
        if old_bare.exists():
            old_bare.rename(new_bare)
    patch['updated_at'] = datetime.now(tz=timezone.utc).isoformat()
    await db.repos.update_one({'id': repo['id']}, {'$set': patch})
    repo.update(patch)
    return await _repo_to_public(repo, user)

@api.delete('/repos/{owner}/{name}')
async def delete_repo(owner: str, name: str, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo or repo['owner_id'] != user['id']:
        raise HTTPException(404, 'Repository not found')
    await db.repos.delete_one({'id': repo['id']})
    await db.issues.delete_many({'repo_id': repo['id']})
    await db.pulls.delete_many({'repo_id': repo['id']})
    await db.stars.delete_many({'repo_id': repo['id']})
    bare = REPO_ROOT / repo['owner'] / (repo['name'] + '.git')
    if bare.exists():
        shutil.rmtree(str(bare), ignore_errors=True)
    return {'ok': True}

@api.post('/repos/{owner}/{name}/star')
async def star_repo(owner: str, name: str, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    result = await db.stars.update_one(
        {'user_id': user['id'], 'repo_id': repo['id']},
        {'$setOnInsert': {'user_id': user['id'], 'repo_id': repo['id'], 'created_at': datetime.now(tz=timezone.utc).isoformat()}},
        upsert=True,
    )
    if result.upserted_id is not None:
        await db.repos.update_one({'id': repo['id']}, {'$inc': {'stars': 1}})
        repo['stars'] = repo.get('stars', 0) + 1
    return {'stars': repo.get('stars', 0), 'is_starred': True}

@api.delete('/repos/{owner}/{name}/star')
async def unstar_repo(owner: str, name: str, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    result = await db.stars.delete_one({'user_id': user['id'], 'repo_id': repo['id']})
    if result.deleted_count:
        await db.repos.update_one({'id': repo['id']}, {'$inc': {'stars': -1}})
        repo['stars'] = max(0, repo.get('stars', 0) - 1)
    return {'stars': repo.get('stars', 0), 'is_starred': False}

# ---------- Issues ----------
@api.get('/repos/{owner}/{name}/issues')
async def list_issues(owner: str, name: str, state: Optional[str] = None, viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    q = {'repo_id': repo['id']}
    if state in ('open', 'closed'):
        q['state'] = state
    issues = await db.issues.find(q).sort('number', -1).to_list(200)
    return [{k: v for k, v in i.items() if k != '_id'} for i in issues]

@api.post('/repos/{owner}/{name}/issues')
async def create_issue(owner: str, name: str, payload: IssueIn, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    last = await db.issues.find_one({'repo_id': repo['id']}, sort=[('number', -1)])
    number = (last['number'] + 1) if last else 1
    issue = {
        'id': str(uuid.uuid4()),
        'repo_id': repo['id'],
        'number': number,
        'title': payload.title,
        'body': payload.body or '',
        'state': 'open',
        'author': user['username'],
        'labels': payload.labels or [],
        'comments': 0,
        'created_at': datetime.now(tz=timezone.utc).isoformat(),
        'updated_at': datetime.now(tz=timezone.utc).isoformat(),
        'when': 'opened just now',
    }
    await db.issues.insert_one(issue)
    return {k: v for k, v in issue.items() if k != '_id'}

@api.patch('/repos/{owner}/{name}/issues/{number}')
async def update_issue(owner: str, name: str, number: int, payload: IssueUpdate, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    issue = await db.issues.find_one({'repo_id': repo['id'], 'number': number})
    if not issue:
        raise HTTPException(404, 'Issue not found')
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    patch['updated_at'] = datetime.now(tz=timezone.utc).isoformat()
    await db.issues.update_one({'id': issue['id']}, {'$set': patch})
    fresh = await db.issues.find_one({'id': issue['id']})
    return {k: v for k, v in fresh.items() if k != '_id'}

# ---------- Repo stats ----------
@api.get('/repos/{owner}/{name}/stats')
async def get_repo_stats(owner: str, name: str, viewer=Depends(get_optional_user)):
    from datetime import timedelta
    from collections import Counter
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    bare = REPO_ROOT / owner.lower() / (name + '.git')
    empty = {'activity': [], 'contributors': [], 'total_commits': 0,
             'open_issues': 0, 'open_prs': 0, 'stars': repo.get('stars', 0)}
    if not bare.exists():
        return empty
    rc, out = await _run_git(['git', 'log', '--format=%aI|%an', 'HEAD'], bare)
    if rc != 0:
        return empty
    commits_raw = []
    for line in out.strip().split('\n'):
        if '|' not in line:
            continue
        date_str, author = line.split('|', 1)
        try:
            dt = datetime.fromisoformat(date_str.strip())
            commits_raw.append({'date': dt, 'author': author.strip()})
        except Exception:
            pass
    # Activity: commits per week for last 26 weeks
    now = datetime.now(tz=timezone.utc)
    activity = []
    for i in range(25, -1, -1):
        w_start = now - timedelta(weeks=i + 1)
        w_end = now - timedelta(weeks=i)
        count = sum(1 for c in commits_raw if w_start <= c['date'] < w_end)
        activity.append({'week': w_start.strftime('%b %d'), 'commits': count})
    # Contributors
    author_counts = Counter(c['author'] for c in commits_raw)
    contributors = [{'author': a, 'commits': n} for a, n in author_counts.most_common(20)]
    open_issues = await db.issues.count_documents({'repo_id': repo['id'], 'state': 'open'})
    open_prs = await db.pulls.count_documents({'repo_id': repo['id'], 'state': 'open'})
    return {
        'activity': activity,
        'contributors': contributors,
        'total_commits': len(commits_raw),
        'open_issues': open_issues,
        'open_prs': open_prs,
        'stars': repo.get('stars', 0),
        'forks': repo.get('forks', 0),
    }

# ---------- Pull requests ----------
def _pr_public(p: dict) -> dict:
    return {
        'id': p['id'],
        'number': p['number'],
        'title': p['title'],
        'body': p.get('body', ''),
        'state': p['state'],
        'author': p['author'],
        'head': p['head'],
        'base': p['base'],
        'comments': p.get('comments', 0),
        'created_at': p['created_at'],
        'updated_at': p.get('updated_at', p['created_at']),
        'when': _humanize_date(p['created_at']),
        'merged_at': p.get('merged_at'),
    }

async def _repo_and_pr(owner: str, name: str, number: int, viewer):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    pr = await db.pulls.find_one({'repo_id': repo['id'], 'number': number})
    if not pr:
        raise HTTPException(404, 'Pull request not found')
    return repo, pr

@api.get('/repos/{owner}/{name}/pulls')
async def list_pulls(owner: str, name: str, state: Optional[str] = None, viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    q: dict = {'repo_id': repo['id']}
    if state in ('open', 'closed', 'merged'):
        q['state'] = state
    items = await db.pulls.find(q).sort('number', -1).to_list(200)
    return [_pr_public(p) for p in items]

@api.post('/repos/{owner}/{name}/pulls')
async def create_pull(owner: str, name: str, payload: PRIn, user=Depends(get_current_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and user['id'] != repo['owner_id']:
        raise HTTPException(404, 'Repository not found')
    last = await db.pulls.find_one({'repo_id': repo['id']}, sort=[('number', -1)])
    number = (last['number'] + 1) if last else 1
    now = datetime.now(tz=timezone.utc).isoformat()
    pr = {
        'id': str(uuid.uuid4()),
        'repo_id': repo['id'],
        'number': number,
        'title': payload.title,
        'body': payload.body or '',
        'state': 'open',
        'author': user['username'],
        'head': payload.head.strip(),
        'base': payload.base.strip() or 'main',
        'comments': 0,
        'created_at': now,
        'updated_at': now,
        'merged_at': None,
    }
    await db.pulls.insert_one(pr)
    return _pr_public(pr)

@api.get('/repos/{owner}/{name}/pulls/{number}')
async def get_pull(owner: str, name: str, number: int, viewer=Depends(get_optional_user)):
    _, pr = await _repo_and_pr(owner, name, number, viewer)
    return _pr_public(pr)

@api.patch('/repos/{owner}/{name}/pulls/{number}')
async def update_pull(owner: str, name: str, number: int, payload: PRUpdate, user=Depends(get_current_user)):
    repo, pr = await _repo_and_pr(owner, name, number, user)
    if user['id'] != repo['owner_id'] and user['username'] != pr['author']:
        raise HTTPException(403, 'Forbidden')
    patch = {k: v for k, v in payload.model_dump().items() if v is not None}
    patch['updated_at'] = datetime.now(tz=timezone.utc).isoformat()
    if patch.get('state') == 'merged':
        patch['merged_at'] = patch['updated_at']
    await db.pulls.update_one({'id': pr['id']}, {'$set': patch})
    pr.update(patch)
    return _pr_public(pr)

@api.get('/repos/{owner}/{name}/pulls/{number}/diff')
async def get_pull_diff(owner: str, name: str, number: int, viewer=Depends(get_optional_user)):
    repo, pr = await _repo_and_pr(owner, name, number, viewer)
    bare = REPO_ROOT / repo['owner'] / (repo['name'] + '.git')
    if not bare.exists():
        return {'diff': None, 'files': []}
    rc, out = await _run_git(['git', 'diff', f'{pr["base"]}...{pr["head"]}', '--name-status'], bare)
    if rc != 0:
        return {'diff': None, 'files': []}
    files = []
    for line in out.strip().split('\n'):
        if line and '\t' in line:
            status, *rest = line.split('\t')
            files.append({'status': status.strip(), 'path': rest[-1].strip()})
    rc2, diff_out = await _run_git(['git', 'diff', f'{pr["base"]}...{pr["head"]}'], bare)
    return {'diff': diff_out if rc2 == 0 else None, 'files': files}

# ---------- Git content API ----------
@api.get('/repos/{owner}/{name}/tree')
async def get_repo_tree(owner: str, name: str, path: str = '', viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    bare = REPO_ROOT / owner.lower() / (name + '.git')
    if not bare.exists():
        return []
    # Validate path
    clean_path = path.strip('/')
    if clean_path and ('..' in clean_path or not _SAFE_BLOB_PATH.match(clean_path)):
        raise HTTPException(400, 'Invalid path')
    tree_ref = f'HEAD:{clean_path}' if clean_path else 'HEAD'
    rc, out = await _run_git(['git', 'ls-tree', tree_ref], bare)
    if rc != 0:
        return []
    entries: dict = {}
    for line in out.strip().split('\n'):
        if not line:
            continue
        meta_part, _, entry_name = line.partition('\t')
        meta = meta_part.split()
        if len(meta) < 3:
            continue
        entries[entry_name] = {'name': entry_name, 'type': 'folder' if meta[1] == 'tree' else 'file', 'sha': meta[2]}
    # Get last commit per entry using log with name-only, filtered by path prefix
    rc2, out2 = await _run_git(
        ['git', 'log', '--format=COMMIT:%h|%s|%an|%aI', '--name-only', 'HEAD'], bare
    )
    prefix = (clean_path.rstrip('/') + '/') if clean_path else ''
    file_to_commit: dict = {}
    current_commit = None
    for line in out2.split('\n'):
        line = line.strip()
        if not line:
            continue
        if line.startswith('COMMIT:'):
            parts = line[7:].split('|', 3)
            if len(parts) == 4:
                current_commit = {'sha': parts[0], 'message': parts[1], 'author': parts[2], 'when': parts[3]}
        elif current_commit:
            if line.startswith(prefix):
                rel = line[len(prefix):]
                top = rel.split('/')[0]
                if top and top not in file_to_commit:
                    file_to_commit[top] = current_commit
    result = []
    for entry_name, entry in sorted(entries.items(), key=lambda x: (x[1]['type'] == 'file', x[0].lower())):
        commit = file_to_commit.get(entry_name, {})
        result.append({
            'name': entry_name,
            'type': entry['type'],
            'lastCommit': commit.get('message', ''),
            'when': _humanize_date(commit.get('when', '')),
            'sha': commit.get('sha', ''),
        })
    return result

@api.get('/repos/{owner}/{name}/commits')
async def get_repo_commits(owner: str, name: str, limit: int = 100, viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    bare = REPO_ROOT / owner.lower() / (name + '.git')
    if not bare.exists():
        return []
    n = max(1, min(limit, 500))
    rc, out = await _run_git(['git', 'log', '--format=%H|%h|%s|%an|%aI|%P', f'-{n}', 'HEAD'], bare)
    if rc != 0:
        return []
    # Build ref map: full SHA -> list of branch/tag names
    rc2, out2 = await _run_git(
        ['git', 'for-each-ref', '--format=%(objectname)|%(refname:short)', 'refs/heads/', 'refs/tags/'],
        bare
    )
    ref_map: dict[str, list] = {}
    for rline in out2.strip().split('\n'):
        if '|' in rline:
            full_sha, refname = rline.split('|', 1)
            ref_map.setdefault(full_sha, []).append(refname)
    commits = []
    for line in out.strip().split('\n'):
        if not line:
            continue
        parts = line.split('|', 5)
        if len(parts) < 5:
            continue
        full_sha = parts[0]
        parents = parts[5].split() if len(parts) > 5 and parts[5].strip() else []
        commits.append({
            'sha': parts[1],
            'fullSha': full_sha,
            'message': parts[2],
            'author': parts[3],
            'when': _humanize_date(parts[4]),
            'date': parts[4],
            'parents': parents,
            'refs': ref_map.get(full_sha, []),
        })
    return commits

@api.get('/repos/{owner}/{name}/blob/{file_path:path}')
async def get_repo_blob(owner: str, name: str, file_path: str, viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    if not file_path or '..' in file_path or file_path.startswith('/') or not _SAFE_BLOB_PATH.match(file_path):
        raise HTTPException(400, 'Invalid file path')
    bare = REPO_ROOT / owner.lower() / (name + '.git')
    if not bare.exists():
        raise HTTPException(404, 'Repository not found')
    rc, out = await _run_git(['git', 'show', f'HEAD:{file_path}'], bare)
    if rc != 0:
        raise HTTPException(404, 'File not found')
    return {'content': out, 'path': file_path}

@api.get('/repos/{owner}/{name}/languages')
async def get_repo_languages(owner: str, name: str, viewer=Depends(get_optional_user)):
    repo = await db.repos.find_one({'owner': owner.lower(), 'name': name})
    if not repo:
        raise HTTPException(404, 'Repository not found')
    if repo['visibility'] == 'Private' and (not viewer or viewer['id'] != repo['owner_id']):
        raise HTTPException(404, 'Repository not found')
    bare = REPO_ROOT / owner.lower() / (name + '.git')
    fallback = [{'language': repo.get('language', 'Unknown'), 'color': repo.get('language_color', '#ccc'), 'percentage': 100.0}]
    if not bare.exists():
        return fallback
    rc, out = await _run_git(['git', 'ls-tree', '-r', '--long', 'HEAD'], bare)
    if rc != 0 or not out.strip():
        return fallback
    lang_bytes: dict[str, dict] = {}
    for line in out.strip().split('\n'):
        if not line:
            continue
        parts = line.split('\t', 1)
        if len(parts) != 2:
            continue
        meta = parts[0].split()
        if len(meta) < 4 or meta[1] != 'blob':
            continue
        try:
            size = int(meta[3])
        except ValueError:
            continue
        ext = Path(parts[1]).suffix.lower()
        mapping = _LANG_MAP.get(ext)
        if not mapping:
            continue
        lang, color = mapping
        if lang not in lang_bytes:
            lang_bytes[lang] = {'bytes': 0, 'color': color}
        lang_bytes[lang]['bytes'] += size
    if not lang_bytes:
        return fallback
    total = sum(v['bytes'] for v in lang_bytes.values())
    result = []
    for lang, v in sorted(lang_bytes.items(), key=lambda x: -x[1]['bytes']):
        pct = round(v['bytes'] / total * 100, 1)
        if pct >= 0.1:
            result.append({'language': lang, 'color': v['color'], 'percentage': pct})
    return result or fallback

# ---------- Feed ----------
@api.get('/feed')
async def feed(user=Depends(get_current_user)):
    repos = await db.repos.find({'visibility': 'Public'}).sort('updated_at', -1).limit(8).to_list(8)
    items = []
    for r in repos:
        items.append({
            'id': r['id'],
            'type': 'release' if r.get('stars', 0) > 100 else 'star',
            'actor': r['owner'],
            'target': f"{r['owner']}/{r['name']}",
            'targetDescription': r.get('description', ''),
            'language': r.get('language', 'Markdown'),
            'languageColor': LANGUAGE_COLORS.get(r.get('language', 'Markdown'), '#888'),
            'stars': r.get('stars', 0),
            'when': r.get('updated_at', ''),
            'title': f"v{(r.get('stars',0)//100)+1}.0.0",
            'body': r.get('description', ''),
        })
    return items

@api.get('/')
async def root():
    return {'app': 'Octopush', 'status': 'ok'}

# ---------- Seed ----------
_SEED_FILES = {
    'awesome-ui-kit': {
        'src/Button.tsx': 'import React from \'react\';\n\nexport interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {\n  variant?: \'default\' | \'outline\' | \'ghost\';\n  size?: \'sm\' | \'md\' | \'lg\';\n}\n\nexport const Button: React.FC<ButtonProps> = ({\n  variant = \'default\',\n  size = \'md\',\n  children,\n  ...props\n}) => (\n  <button\n    className={`btn btn-${variant} btn-${size}`}\n    {...props}\n  >\n    {children}\n  </button>\n);\n',
        'src/Input.tsx': 'import React from \'react\';\n\nexport const Input = React.forwardRef<\n  HTMLInputElement,\n  React.InputHTMLAttributes<HTMLInputElement>\n>((props, ref) => (\n  <input ref={ref} className="input" {...props} />\n));\nInput.displayName = \'Input\';\n',
        'src/Select.tsx': 'import React from \'react\';\n\nexport interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {\n  options: { value: string; label: string }[];\n}\n\nexport const Select: React.FC<SelectProps> = ({ options, ...props }) => (\n  <select className="select" {...props}>\n    {options.map((o) => (\n      <option key={o.value} value={o.value}>{o.label}</option>\n    ))}\n  </select>\n);\n',
        'src/index.ts': 'export { Button } from \'./Button\';\nexport { Input } from \'./Input\';\nexport { Select } from \'./Select\';\n',
        'tests/Button.test.tsx': 'import { render, screen } from \'@testing-library/react\';\nimport userEvent from \'@testing-library/user-event\';\nimport { Button } from \'../src\';\n\ntest(\'renders button with children\', () => {\n  render(<Button>Click me</Button>);\n  expect(screen.getByText(\'Click me\')).toBeInTheDocument();\n});\n\ntest(\'calls onClick when clicked\', async () => {\n  const onClick = jest.fn();\n  render(<Button onClick={onClick}>Click</Button>);\n  await userEvent.click(screen.getByRole(\'button\'));\n  expect(onClick).toHaveBeenCalledTimes(1);\n});\n',
        '.github/workflows/ci.yml': 'name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: npm\n      - run: npm ci\n      - run: npm test -- --passWithNoTests\n      - run: npm run build\n',
        'package.json': '{\n  "name": "awesome-ui-kit",\n  "version": "1.0.0",\n  "description": "A modern, accessible React UI kit built with Tailwind and Radix.",\n  "main": "dist/index.js",\n  "scripts": {\n    "build": "tsc",\n    "test": "jest"\n  },\n  "dependencies": {\n    "react": "^18.0.0",\n    "@radix-ui/react-dialog": "^1.0.0"\n  },\n  "devDependencies": {\n    "typescript": "^5.0.0",\n    "@testing-library/react": "^14.0.0",\n    "jest": "^29.0.0"\n  }\n}\n',
        'tsconfig.json': '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "lib": ["ES2022", "DOM"],\n    "jsx": "react",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "strict": true,\n    "declaration": true,\n    "outDir": "dist"\n  },\n  "include": ["src"]\n}\n',
        '.eslintrc.json': '{\n  "extends": [\n    "eslint:recommended",\n    "plugin:@typescript-eslint/recommended",\n    "plugin:react-hooks/recommended"\n  ],\n  "rules": {\n    "@typescript-eslint/no-explicit-any": "warn"\n  }\n}\n',
        '.gitignore': 'node_modules/\ndist/\n.env.local\n*.tsbuildinfo\ncoverage/\n',
        'LICENSE': 'MIT License\n\nCopyright (c) 2024 octodev\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software.\n',
        'README.md': '# awesome-ui-kit\n\nA modern, accessible React UI kit built with Tailwind and Radix.\n\n## Install\n\n```bash\nnpm install awesome-ui-kit\n```\n\n## Usage\n\n```tsx\nimport { Button, Input, Select } from \'awesome-ui-kit\';\n\nfunction App() {\n  return <Button variant="default">Click me</Button>;\n}\n```\n\n## Components\n\n- `Button` — primary, outline, ghost variants\n- `Input` — accessible text input\n- `Select` — dropdown select\n\n## License\n\nMIT\n',
    },
    'fastapi-starter': {
        'app/__init__.py': '',
        'app/main.py': 'from fastapi import FastAPI\nfrom app.routers import auth, users\n\napp = FastAPI(title="Starter API", version="1.0.0")\n\napp.include_router(auth.router, prefix="/auth", tags=["auth"])\napp.include_router(users.router, prefix="/users", tags=["users"])\n\n@app.get("/health")\ndef health():\n    return {"status": "ok"}\n',
        'app/models.py': 'from pydantic import BaseModel, EmailStr\nfrom typing import Optional\n\nclass UserCreate(BaseModel):\n    username: str\n    email: EmailStr\n    password: str\n\nclass UserPublic(BaseModel):\n    id: str\n    username: str\n    email: str\n    name: Optional[str] = None\n',
        'app/routers/__init__.py': '',
        'app/routers/auth.py': 'from fastapi import APIRouter, HTTPException\nfrom app.models import UserCreate\n\nrouter = APIRouter()\n\n@router.post("/signup")\nasync def signup(payload: UserCreate):\n    # TODO: hash password, insert to DB\n    return {"message": "User created"}\n\n@router.post("/login")\nasync def login(identifier: str, password: str):\n    # TODO: verify credentials, return JWT\n    raise HTTPException(501, "Not implemented")\n',
        'app/routers/users.py': 'from fastapi import APIRouter, Depends\n\nrouter = APIRouter()\n\n@router.get("/me")\nasync def me():\n    return {"username": "demo"}\n',
        'requirements.txt': 'fastapi==0.110.1\nuvicorn[standard]==0.25.0\nmotor==3.3.1\nbcrypt==4.1.3\nPyJWT==2.8.0\npydantic[email]==2.5.0\npython-dotenv==1.0.0\n',
        'Dockerfile': 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]\n',
        '.gitignore': '__pycache__/\n*.pyc\n.env\n.venv/\nvenv/\n*.egg-info/\ndist/\n',
        'README.md': '# fastapi-starter\n\nProduction-ready FastAPI starter with auth, JWT, and MongoDB.\n\n## Quick start\n\n```bash\npip install -r requirements.txt\nuvicorn app.main:app --reload\n```\n\n## Docker\n\n```bash\ndocker build -t fastapi-starter .\ndocker run -p 8000:8000 fastapi-starter\n```\n\n## Structure\n\n```\napp/\n  main.py        # FastAPI app\n  models.py      # Pydantic schemas\n  routers/       # Route handlers\n    auth.py\n    users.py\n```\n',
    },
    'dotfiles': {
        '.zshrc': '# ZSH Configuration\nexport EDITOR=nvim\nexport PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"\n\n# Aliases\nalias ll="ls -la"\nalias la="ls -A"\nalias gs="git status"\nalias ga="git add"\nalias gc="git commit"\nalias gp="git push"\nalias gl="git log --oneline --graph"\nalias vim="nvim"\n\n# History\nHISTSIZE=10000\nHISTFILE=~/.zsh_history\nsetopt HIST_IGNORE_DUPS\n\n# Prompt\nautoload -U promptinit\npromptinit\n',
        '.tmux.conf': '# Tmux configuration\nset -g prefix C-a\nunbind C-b\nbind C-a send-prefix\n\n# Reload config\nbind r source-file ~/.tmux.conf \\; display "Config reloaded"\n\n# Mouse support\nset -g mouse on\n\n# Window numbering\nset -g base-index 1\n\n# Split panes\nbind | split-window -h\nbind - split-window -v\n\n# Status bar\nset -g status-style bg=black,fg=white\n',
        'nvim/init.lua': '-- Neovim configuration\nvim.opt.number = true\nvim.opt.relativenumber = true\nvim.opt.tabstop = 2\nvim.opt.shiftwidth = 2\nvim.opt.expandtab = true\nvim.opt.wrap = false\nvim.opt.termguicolors = true\nvim.opt.scrolloff = 8\n\n-- Keymaps\nvim.g.mapleader = " "\nvim.keymap.set("n", "<leader>w", "<cmd>w<cr>")\nvim.keymap.set("n", "<leader>q", "<cmd>q<cr>")\n',
        'install.sh': '#!/bin/bash\nset -e\n\nDOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"\n\necho "Installing dotfiles from $DOTFILES_DIR..."\n\n# ZSH\nln -sf "$DOTFILES_DIR/.zshrc" "$HOME/.zshrc"\necho "  -> .zshrc"\n\n# tmux\nln -sf "$DOTFILES_DIR/.tmux.conf" "$HOME/.tmux.conf"\necho "  -> .tmux.conf"\n\n# Neovim\nmkdir -p "$HOME/.config/nvim"\nln -sf "$DOTFILES_DIR/nvim/init.lua" "$HOME/.config/nvim/init.lua"\necho "  -> nvim/init.lua"\n\necho "Done! Restart your shell."\n',
        'README.md': '# dotfiles\n\nMy personal dotfiles for macOS / Linux.\n\n## Install\n\n```bash\ngit clone http://localhost:8000/octodev/dotfiles.git ~/dotfiles\ncd ~/dotfiles\nbash install.sh\n```\n\n## Contents\n\n| File | Description |\n|------|-------------|\n| `.zshrc` | ZSH shell config with aliases |\n| `.tmux.conf` | Tmux config |\n| `nvim/init.lua` | Neovim config in Lua |\n| `install.sh` | Symlink installer |\n',
    },
    'react-charts': {
        'src/LineChart.jsx': 'import React, { useMemo } from \'react\';\n\nexport const LineChart = ({ data = [], width = 400, height = 200, color = \'#f97316\' }) => {\n  const points = useMemo(() => {\n    if (!data.length) return \'\';\n    const maxY = Math.max(...data.map((d) => d.y));\n    const minY = Math.min(...data.map((d) => d.y));\n    const xStep = width / (data.length - 1);\n    return data.map((d, i) => {\n      const x = i * xStep;\n      const y = height - ((d.y - minY) / (maxY - minY || 1)) * height;\n      return `${x},${y}`;\n    }).join(\' \');\n  }, [data, width, height]);\n\n  return (\n    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>\n      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />\n    </svg>\n  );\n};\n',
        'src/BarChart.jsx': 'import React from \'react\';\n\nexport const BarChart = ({ data = [], width = 400, height = 200, color = \'#f97316\' }) => {\n  const maxY = Math.max(...data.map((d) => d.y), 1);\n  const barWidth = width / data.length - 4;\n\n  return (\n    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>\n      {data.map((d, i) => {\n        const barHeight = (d.y / maxY) * height;\n        return (\n          <rect\n            key={i}\n            x={i * (barWidth + 4)}\n            y={height - barHeight}\n            width={barWidth}\n            height={barHeight}\n            fill={color}\n            rx={2}\n          />\n        );\n      })}\n    </svg>\n  );\n};\n',
        'src/PieChart.jsx': 'import React from \'react\';\n\nexport const PieChart = ({ data = [], size = 200 }) => {\n  const total = data.reduce((s, d) => s + d.value, 0);\n  let angle = -Math.PI / 2;\n  const r = size / 2;\n\n  return (\n    <svg width={size} height={size}>\n      {data.map((d, i) => {\n        const slice = (d.value / total) * 2 * Math.PI;\n        const x1 = r + r * Math.cos(angle);\n        const y1 = r + r * Math.sin(angle);\n        angle += slice;\n        const x2 = r + r * Math.cos(angle);\n        const y2 = r + r * Math.sin(angle);\n        const largeArc = slice > Math.PI ? 1 : 0;\n        return (\n          <path\n            key={i}\n            d={`M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}\n            fill={d.color || \'#f97316\'}\n          />\n        );\n      })}\n    </svg>\n  );\n};\n',
        'src/index.js': 'export { LineChart } from \'./LineChart\';\nexport { BarChart } from \'./BarChart\';\nexport { PieChart } from \'./PieChart\';\n',
        'package.json': '{\n  "name": "react-charts",\n  "version": "0.1.0",\n  "description": "Composable, animated chart components for React.",\n  "main": "src/index.js",\n  "dependencies": {\n    "react": "^18.0.0"\n  },\n  "peerDependencies": {\n    "react": ">=17.0.0"\n  }\n}\n',
        '.gitignore': 'node_modules/\ndist/\n',
        'README.md': '# react-charts\n\nComposable, animated chart components for React. Zero dependencies (just React).\n\n## Usage\n\n```jsx\nimport { LineChart, BarChart, PieChart } from \'react-charts\';\n\n<LineChart data={[{ y: 1 }, { y: 3 }, { y: 2 }]} color="#f97316" />\n<BarChart data={[{ y: 10 }, { y: 20 }, { y: 15 }]} />\n<PieChart data={[{ value: 30, color: \'#f97316\' }, { value: 70, color: \'#3178c6\' }]} />\n```\n',
    },
    'private-notes': {
        'README.md': '# private-notes\n\nPersonal notes and snippets. Private repo.\n',
        'notes/setup.md': '# Setup Notes\n\n## macOS initial setup\n\n1. Install Homebrew\n2. Install git, node, python\n3. Clone dotfiles\n',
        'notes/cheatsheets.md': '# Cheatsheets\n\n## Git\n\n```bash\ngit log --oneline --graph\ngit stash pop\ngit rebase -i HEAD~3\n```\n\n## Docker\n\n```bash\ndocker ps -a\ndocker logs -f container\ndocker exec -it container bash\n```\n',
    },
}

async def seed():
    if await db.users.count_documents({}) > 0:
        return
    now = datetime.now(tz=timezone.utc).isoformat()
    demo = {
        'id': str(uuid.uuid4()),
        'username': 'octodev',
        'email': 'demo@octopush.dev',
        'password_hash': hash_pw('password123'),
        'name': 'Octo Developer',
        'bio': 'Full-stack developer passionate about open source.',
        'avatar': 'https://api.dicebear.com/9.x/identicon/svg?seed=octodev&backgroundColor=fb6f1c',
        'company': '@octopush',
        'location': 'Paris, France',
        'website': 'https://octopush.dev',
        'created_at': now,
    }
    await db.users.insert_one(demo)
    repos_seed = [
        {'name': 'awesome-ui-kit', 'description': 'A modern, accessible React UI kit built with Tailwind and Radix.',
         'language': 'TypeScript', 'stars': 1284, 'forks': 142, 'watchers': 38,
         'topics': ['react', 'ui-kit', 'tailwindcss', 'radix'], 'visibility': 'Public', 'is_pinned': True},
        {'name': 'fastapi-starter', 'description': 'Production-ready FastAPI starter with auth, JWT, MongoDB.',
         'language': 'Python', 'stars': 562, 'forks': 73, 'watchers': 18,
         'topics': ['fastapi', 'mongodb', 'jwt', 'python'], 'visibility': 'Public', 'is_pinned': True},
        {'name': 'dotfiles', 'description': 'My personal dotfiles for macOS / Linux.',
         'language': 'Shell', 'stars': 42, 'forks': 6, 'watchers': 3,
         'topics': ['zsh', 'tmux', 'neovim'], 'visibility': 'Public', 'is_pinned': True},
        {'name': 'react-charts', 'description': 'Composable, animated chart components for React.',
         'language': 'JavaScript', 'stars': 318, 'forks': 27, 'watchers': 9,
         'topics': ['react', 'charts', 'd3'], 'visibility': 'Public', 'is_pinned': True},
        {'name': 'private-notes', 'description': 'Personal notes and snippets.',
         'language': 'Markdown', 'stars': 0, 'forks': 0, 'watchers': 1,
         'topics': [], 'visibility': 'Private', 'is_pinned': False},
    ]
    seeded_repos = []
    for r in repos_seed:
        doc = {
            'id': str(uuid.uuid4()),
            'owner': demo['username'],
            'owner_id': demo['id'],
            'branch': 'main',
            'readme': f"# {r['name']}\n\n{r['description']}\n",
            'created_at': now, 'updated_at': now,
            **r,
        }
        seeded_repos.append(doc)
    await db.repos.insert_many(seeded_repos)

    # Create bare git repos with real content (sync, runs at startup)
    loop = asyncio.get_event_loop()
    for repo_doc in seeded_repos:
        repo_name = repo_doc['name']
        files = _SEED_FILES.get(repo_name, {'README.md': repo_doc.get('readme', f'# {repo_name}\n')})
        try:
            await loop.run_in_executor(
                None, init_bare_repo, demo['username'], repo_name, repo_doc['visibility']
            )
            bare_path = REPO_ROOT / demo['username'] / (repo_name + '.git')
            if bare_path.exists():
                await loop.run_in_executor(
                    None, _seed_initial_commit, bare_path, files, 'Initial commit: project setup'
                )
                # Second commit for main repos
                if repo_name == 'awesome-ui-kit':
                    await loop.run_in_executor(
                        None, _push_extra_commit, bare_path,
                        'README.md',
                        files['README.md'] + '\n## Contributing\n\nPRs welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.\n',
                        'docs: add contributing section'
                    )
                elif repo_name == 'fastapi-starter':
                    await loop.run_in_executor(
                        None, _push_extra_commit, bare_path,
                        'app/routers/auth.py',
                        files['app/routers/auth.py'].replace('# TODO: hash password, insert to DB', '# Insert user into MongoDB with hashed password'),
                        'feat: scaffold auth router'
                    )
        except Exception as exc:
            print(f'[seed] git init failed for {repo_name}: {exc}')

    # Issues for first repo
    first = seeded_repos[0]
    issues_seed = [
        {'title': 'Dialog: focus trap escapes on iOS Safari', 'state': 'open', 'author': 'janedoe',
         'labels': [{'name': 'bug', 'color': '#d73a4a'}, {'name': 'iOS', 'color': '#0075ca'}], 'comments': 4},
        {'title': 'Add Combobox component', 'state': 'open', 'author': 'octodev',
         'labels': [{'name': 'enhancement', 'color': '#a2eeef'}], 'comments': 12},
        {'title': 'Tooltip cuts off near viewport edges', 'state': 'closed', 'author': 'maxr',
         'labels': [{'name': 'bug', 'color': '#d73a4a'}], 'comments': 6},
        {'title': 'Improve TypeScript types for Select', 'state': 'closed', 'author': 'lisa',
         'labels': [{'name': 'typescript', 'color': '#3178c6'}, {'name': 'good first issue', 'color': '#7057ff'}], 'comments': 3},
    ]
    for n, i in enumerate(issues_seed, start=1):
        await db.issues.insert_one({
            'id': str(uuid.uuid4()),
            'repo_id': first['id'],
            'number': n,
            'body': '',
            'created_at': now, 'updated_at': now,
            'when': 'opened 2 days ago' if i['state'] == 'open' else 'closed 3 days ago',
            **i,
        })

@app.on_event('startup')
async def on_startup():
    await seed()

@app.on_event('shutdown')
async def on_shutdown():
    client.close()

# ---------- Git HTTP smart protocol — MUST be before include_router ----------
@app.api_route('/{owner}/{repo_name}.git/{git_path:path}', methods=['GET', 'POST'])
async def git_http_backend_handler(owner: str, repo_name: str, git_path: str, request: Request):
    if not _validate_repo_names(owner, repo_name):
        return Response(content=b'Invalid repository path', status_code=400)

    is_push = (
        git_path == 'git-receive-pack' or
        request.query_params.get('service') == 'git-receive-pack'
    )

    repo = await db.repos.find_one({'owner': owner.lower(), 'name': repo_name})
    if not repo:
        return Response(content=b'Repository not found', status_code=404)

    is_private = repo.get('visibility') == 'Private'
    auth_header = request.headers.get('authorization', '')
    creds = _parse_basic_auth(auth_header)

    authed_user = None
    if creds:
        db_user = await db.users.find_one({'username': creds[0].lower()})
        if db_user and verify_pw(creds[1], db_user['password_hash']):
            authed_user = db_user

    if is_push:
        if authed_user is None:
            return Response(
                content=b'Authentication required',
                status_code=401,
                headers={'WWW-Authenticate': 'Basic realm="Octopush"'},
            )
        if authed_user['id'] != repo['owner_id']:
            return Response(content=b'Forbidden: you are not the owner of this repository', status_code=403)

    if is_private:
        if authed_user is None:
            return Response(
                content=b'Authentication required',
                status_code=401,
                headers={'WWW-Authenticate': 'Basic realm="Octopush"'},
            )
        if authed_user['id'] != repo['owner_id']:
            return Response(content=b'Forbidden', status_code=403)

    bare = REPO_ROOT / owner.lower() / (repo_name + '.git')
    if not bare.exists():
        return Response(content=b'Repository has no content yet. Push a commit first.', status_code=404)

    body = await request.body()
    git_protocol = request.headers.get('git-protocol', '')

    cgi_env = {
        'REQUEST_METHOD': request.method,
        'PATH_INFO': f'/{owner.lower()}/{repo_name}.git/{git_path}',
        'QUERY_STRING': str(request.url.query) if request.url.query else '',
        'CONTENT_TYPE': request.headers.get('content-type', ''),
        'CONTENT_LENGTH': str(len(body)),
        'REMOTE_ADDR': request.client.host if request.client else '127.0.0.1',
        'GIT_PROJECT_ROOT': str(REPO_ROOT),
        'GIT_HTTP_EXPORT_ALL': '1',
        'GIT_EXEC_PATH': _GIT_EXEC_PATH,
        'PATH': os.environ.get('PATH', '/usr/bin:/bin:/usr/local/bin'),
        'HOME': os.environ.get('HOME', '/tmp'),
    }
    if authed_user:
        cgi_env['REMOTE_USER'] = authed_user['username']
    if git_protocol:
        cgi_env['GIT_PROTOCOL'] = git_protocol

    try:
        proc = await asyncio.create_subprocess_exec(
            GIT_HTTP_BACKEND,
            env=cgi_env,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(input=body), timeout=120)
    except asyncio.TimeoutError:
        return Response(content=b'Git operation timed out', status_code=504)
    except Exception as e:
        return Response(content=f'Git backend error: {e}'.encode(), status_code=500)

    # Parse CGI output (headers \r\n\r\n body)
    sep = stdout.find(b'\r\n\r\n')
    if sep != -1:
        headers_raw = stdout[:sep].decode('utf-8', errors='replace')
        response_body = stdout[sep + 4:]
    else:
        sep = stdout.find(b'\n\n')
        if sep != -1:
            headers_raw = stdout[:sep].decode('utf-8', errors='replace')
            response_body = stdout[sep + 2:]
        else:
            return Response(content=b'Invalid git backend response', status_code=500)

    parsed_headers: dict = {}
    status_code = 200
    for line in headers_raw.replace('\r\n', '\n').split('\n'):
        if ':' not in line:
            continue
        key, _, val = line.partition(':')
        key, val = key.strip(), val.strip()
        if key.lower() == 'status':
            try:
                status_code = int(val.split()[0])
            except (ValueError, IndexError):
                pass
        else:
            parsed_headers[key] = val

    return Response(
        content=response_body,
        status_code=status_code,
        headers=parsed_headers,
        media_type=parsed_headers.get('Content-Type'),
    )

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)
