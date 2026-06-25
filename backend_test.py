#!/usr/bin/env python3
"""
Comprehensive backend API tests for Octopush
Tests all endpoints with proper authentication flow
"""
import requests
import random
import string
import sys
from typing import Optional

# Base URL from frontend/.env
BASE_URL = "https://repo-central-8.preview.emergentagent.com/api"

# Test results tracking
passed_tests = []
failed_tests = []

def random_string(length=8):
    """Generate random string for unique test data"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"   Details: {details}")
    
    if passed:
        passed_tests.append(name)
    else:
        failed_tests.append(f"{name} - {details}")

def test_health():
    """Test 1: Health endpoint"""
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        data = resp.json()
        
        if resp.status_code == 200 and data.get('app') == 'Octopush' and data.get('status') == 'ok':
            log_test("Health check", True)
            return True
        else:
            log_test("Health check", False, f"Expected app='Octopush' status='ok', got {data}")
            return False
    except Exception as e:
        log_test("Health check", False, str(e))
        return False

def test_auth_signup():
    """Test 2: Auth signup"""
    username = f"testuser_{random_string()}"
    email = f"{random_string()}@test.com"
    password = "secret123"
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "username": username,
            "email": email,
            "password": password
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'token' in data and 'user' in data:
                log_test("Auth signup - success", True)
                return username, email, password, data['token']
            else:
                log_test("Auth signup - success", False, "Missing token or user in response")
                return None, None, None, None
        else:
            log_test("Auth signup - success", False, f"Status {resp.status_code}: {resp.text}")
            return None, None, None, None
    except Exception as e:
        log_test("Auth signup - success", False, str(e))
        return None, None, None, None

def test_auth_login(username: str, password: str):
    """Test 3: Auth login with correct credentials"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "identifier": username,
            "password": password
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'token' in data:
                log_test("Auth login - correct password", True)
                return data['token']
            else:
                log_test("Auth login - correct password", False, "Missing token in response")
                return None
        else:
            log_test("Auth login - correct password", False, f"Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        log_test("Auth login - correct password", False, str(e))
        return None

def test_auth_login_wrong_password(username: str):
    """Test 4: Auth login with wrong password"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "identifier": username,
            "password": "wrongpassword"
        }, timeout=10)
        
        if resp.status_code == 401:
            log_test("Auth login - wrong password returns 401", True)
            return True
        else:
            log_test("Auth login - wrong password returns 401", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Auth login - wrong password returns 401", False, str(e))
        return False

def test_auth_me_with_token(token: str):
    """Test 5: Get current user with valid token"""
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'username' in data and 'email' in data:
                log_test("Auth /me with token", True)
                return True
            else:
                log_test("Auth /me with token", False, "Missing user fields")
                return False
        else:
            log_test("Auth /me with token", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Auth /me with token", False, str(e))
        return False

def test_auth_me_without_token():
    """Test 6: Get current user without token"""
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        
        if resp.status_code == 401:
            log_test("Auth /me without token returns 401", True)
            return True
        else:
            log_test("Auth /me without token returns 401", False, f"Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Auth /me without token returns 401", False, str(e))
        return False

def test_auth_duplicate_signup(username: str, email: str):
    """Test 7: Signup with duplicate username"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/signup", json={
            "username": username,
            "email": f"different_{email}",
            "password": "secret123"
        }, timeout=10)
        
        if resp.status_code == 409:
            log_test("Auth signup - duplicate username returns 409", True)
            return True
        else:
            log_test("Auth signup - duplicate username returns 409", False, f"Expected 409, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Auth signup - duplicate username returns 409", False, str(e))
        return False

def test_demo_user_login():
    """Test 8: Login with seeded demo user"""
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "identifier": "octodev",
            "password": "password123"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'token' in data:
                log_test("Demo user login (octodev)", True)
                return data['token']
            else:
                log_test("Demo user login (octodev)", False, "Missing token")
                return None
        else:
            log_test("Demo user login (octodev)", False, f"Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        log_test("Demo user login (octodev)", False, str(e))
        return None

def test_get_user_profile(username: str = "octodev"):
    """Test 9: Get user profile"""
    try:
        resp = requests.get(f"{BASE_URL}/users/{username}", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ['username', 'followers', 'following', 'is_following']
            if all(field in data for field in required_fields):
                log_test(f"Get user profile ({username})", True)
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                log_test(f"Get user profile ({username})", False, f"Missing fields: {missing}")
                return False
        else:
            log_test(f"Get user profile ({username})", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test(f"Get user profile ({username})", False, str(e))
        return False

def test_get_nonexistent_user():
    """Test 10: Get nonexistent user"""
    try:
        resp = requests.get(f"{BASE_URL}/users/nonexistentuser999", timeout=10)
        
        if resp.status_code == 404:
            log_test("Get nonexistent user returns 404", True)
            return True
        else:
            log_test("Get nonexistent user returns 404", False, f"Expected 404, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Get nonexistent user returns 404", False, str(e))
        return False

def test_get_user_repos_anonymous():
    """Test 11: Get user repos without auth (should hide private)"""
    try:
        resp = requests.get(f"{BASE_URL}/users/octodev/repos", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 4:
                log_test("Get octodev repos (anonymous) - 4 public repos", True)
                return True
            else:
                log_test("Get octodev repos (anonymous) - 4 public repos", False, f"Expected 4 repos, got {len(data) if isinstance(data, list) else 'not a list'}")
                return False
        else:
            log_test("Get octodev repos (anonymous) - 4 public repos", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Get octodev repos (anonymous) - 4 public repos", False, str(e))
        return False

def test_get_user_repos_authenticated(token: str):
    """Test 12: Get user repos with auth (should show private)"""
    try:
        resp = requests.get(f"{BASE_URL}/users/octodev/repos", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 5:
                log_test("Get octodev repos (authenticated) - 5 repos incl private", True)
                return True
            else:
                log_test("Get octodev repos (authenticated) - 5 repos incl private", False, f"Expected 5 repos, got {len(data) if isinstance(data, list) else 'not a list'}")
                return False
        else:
            log_test("Get octodev repos (authenticated) - 5 repos incl private", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Get octodev repos (authenticated) - 5 repos incl private", False, str(e))
        return False

def test_update_user_profile(token: str):
    """Test 13: Update user profile"""
    try:
        resp = requests.patch(f"{BASE_URL}/users/me", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "bio": "Updated bio for testing"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('bio') == "Updated bio for testing":
                log_test("Update user profile", True)
                return True
            else:
                log_test("Update user profile", False, f"Bio not updated: {data.get('bio')}")
                return False
        else:
            log_test("Update user profile", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Update user profile", False, str(e))
        return False

def test_follow_user(token: str, target_username: str = "octodev"):
    """Test 14: Follow a user"""
    try:
        resp = requests.post(f"{BASE_URL}/users/{target_username}/follow", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            # Verify is_following is true
            profile_resp = requests.get(f"{BASE_URL}/users/{target_username}", headers={
                "Authorization": f"Bearer {token}"
            }, timeout=10)
            
            if profile_resp.status_code == 200:
                profile = profile_resp.json()
                if profile.get('is_following') == True:
                    log_test(f"Follow user ({target_username})", True)
                    return True
                else:
                    log_test(f"Follow user ({target_username})", False, "is_following not true after follow")
                    return False
            else:
                log_test(f"Follow user ({target_username})", False, "Could not verify follow status")
                return False
        else:
            log_test(f"Follow user ({target_username})", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test(f"Follow user ({target_username})", False, str(e))
        return False

def test_unfollow_user(token: str, target_username: str = "octodev"):
    """Test 15: Unfollow a user"""
    try:
        resp = requests.delete(f"{BASE_URL}/users/{target_username}/follow", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            # Verify is_following is false
            profile_resp = requests.get(f"{BASE_URL}/users/{target_username}", headers={
                "Authorization": f"Bearer {token}"
            }, timeout=10)
            
            if profile_resp.status_code == 200:
                profile = profile_resp.json()
                if profile.get('is_following') == False:
                    log_test(f"Unfollow user ({target_username})", True)
                    return True
                else:
                    log_test(f"Unfollow user ({target_username})", False, "is_following not false after unfollow")
                    return False
            else:
                log_test(f"Unfollow user ({target_username})", False, "Could not verify unfollow status")
                return False
        else:
            log_test(f"Unfollow user ({target_username})", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test(f"Unfollow user ({target_username})", False, str(e))
        return False

def test_self_follow(token: str):
    """Test 16: Try to follow yourself (should fail)"""
    try:
        # First get current user
        me_resp = requests.get(f"{BASE_URL}/auth/me", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if me_resp.status_code != 200:
            log_test("Self-follow returns 400", False, "Could not get current user")
            return False
        
        username = me_resp.json()['username']
        
        resp = requests.post(f"{BASE_URL}/users/{username}/follow", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 400:
            log_test("Self-follow returns 400", True)
            return True
        else:
            log_test("Self-follow returns 400", False, f"Expected 400, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Self-follow returns 400", False, str(e))
        return False

def test_create_repo(token: str):
    """Test 17: Create a repository"""
    repo_name = f"my-test-repo-{random_string(6)}"
    
    try:
        resp = requests.post(f"{BASE_URL}/repos", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "name": repo_name,
            "description": "Test repository",
            "visibility": "Public",
            "language": "Python"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ['name', 'language_color', 'stars']
            if all(field in data for field in required_fields) and data['stars'] == 0:
                log_test("Create repository", True)
                return repo_name
            else:
                log_test("Create repository", False, f"Missing fields or stars != 0: {data}")
                return None
        else:
            log_test("Create repository", False, f"Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        log_test("Create repository", False, str(e))
        return None

def test_get_repo(owner: str, repo_name: str):
    """Test 18: Get repository"""
    try:
        resp = requests.get(f"{BASE_URL}/repos/{owner}/{repo_name}", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('name') == repo_name and data.get('owner') == owner:
                log_test(f"Get repository ({owner}/{repo_name})", True)
                return True
            else:
                log_test(f"Get repository ({owner}/{repo_name})", False, f"Name/owner mismatch: {data}")
                return False
        else:
            log_test(f"Get repository ({owner}/{repo_name})", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test(f"Get repository ({owner}/{repo_name})", False, str(e))
        return False

def test_duplicate_repo(token: str, repo_name: str):
    """Test 19: Create duplicate repository"""
    try:
        resp = requests.post(f"{BASE_URL}/repos", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "name": repo_name,
            "description": "Duplicate test",
            "visibility": "Public",
            "language": "Python"
        }, timeout=10)
        
        if resp.status_code == 409:
            log_test("Create duplicate repo returns 409", True)
            return True
        else:
            log_test("Create duplicate repo returns 409", False, f"Expected 409, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Create duplicate repo returns 409", False, str(e))
        return False

def test_update_repo(token: str, owner: str, repo_name: str):
    """Test 20: Update repository"""
    try:
        resp = requests.patch(f"{BASE_URL}/repos/{owner}/{repo_name}", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "description": "Updated description"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('description') == "Updated description":
                log_test("Update repository", True)
                return True
            else:
                log_test("Update repository", False, f"Description not updated: {data.get('description')}")
                return False
        else:
            log_test("Update repository", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Update repository", False, str(e))
        return False

def test_get_trending_repos():
    """Test 21: Get trending repositories"""
    try:
        resp = requests.get(f"{BASE_URL}/repos/trending", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if sorted by stars (first should be awesome-ui-kit with 1284 stars)
                if data[0].get('name') == 'awesome-ui-kit' and data[0].get('stars') >= 1284:
                    log_test("Get trending repos (sorted by stars)", True)
                    return True
                else:
                    log_test("Get trending repos (sorted by stars)", False, f"First repo: {data[0].get('name')} with {data[0].get('stars')} stars")
                    return False
            else:
                log_test("Get trending repos (sorted by stars)", False, "Empty or invalid response")
                return False
        else:
            log_test("Get trending repos (sorted by stars)", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Get trending repos (sorted by stars)", False, str(e))
        return False

def test_star_repo(token: str):
    """Test 22: Star a repository"""
    try:
        resp = requests.post(f"{BASE_URL}/repos/octodev/awesome-ui-kit/star", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('is_starred') == True and data.get('stars') >= 1284:
                log_test("Star repository", True)
                return data.get('stars')
            else:
                log_test("Star repository", False, f"is_starred={data.get('is_starred')}, stars={data.get('stars')}")
                return None
        else:
            log_test("Star repository", False, f"Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        log_test("Star repository", False, str(e))
        return None

def test_star_idempotent(token: str, expected_stars: int):
    """Test 23: Star same repo again (idempotent)"""
    try:
        resp = requests.post(f"{BASE_URL}/repos/octodev/awesome-ui-kit/star", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('stars') == expected_stars:
                log_test("Star idempotent (stars unchanged)", True)
                return True
            else:
                log_test("Star idempotent (stars unchanged)", False, f"Expected {expected_stars}, got {data.get('stars')}")
                return False
        else:
            log_test("Star idempotent (stars unchanged)", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Star idempotent (stars unchanged)", False, str(e))
        return False

def test_unstar_repo(token: str):
    """Test 24: Unstar a repository"""
    try:
        resp = requests.delete(f"{BASE_URL}/repos/octodev/awesome-ui-kit/star", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('is_starred') == False and data.get('stars') >= 1284:
                log_test("Unstar repository", True)
                return True
            else:
                log_test("Unstar repository", False, f"is_starred={data.get('is_starred')}, stars={data.get('stars')}")
                return False
        else:
            log_test("Unstar repository", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Unstar repository", False, str(e))
        return False

def test_delete_repo(token: str, owner: str, repo_name: str):
    """Test 25: Delete repository"""
    try:
        resp = requests.delete(f"{BASE_URL}/repos/{owner}/{repo_name}", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            # Verify it's deleted
            get_resp = requests.get(f"{BASE_URL}/repos/{owner}/{repo_name}", timeout=10)
            if get_resp.status_code == 404:
                log_test("Delete repository", True)
                return True
            else:
                log_test("Delete repository", False, "Repo still exists after delete")
                return False
        else:
            log_test("Delete repository", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Delete repository", False, str(e))
        return False

def test_delete_repo_unauthorized():
    """Test 26: Delete someone else's repo (unauthorized)"""
    try:
        resp = requests.delete(f"{BASE_URL}/repos/octodev/awesome-ui-kit", timeout=10)
        
        if resp.status_code in [401, 404]:
            log_test("Delete unauthorized repo returns 401/404", True)
            return True
        else:
            log_test("Delete unauthorized repo returns 401/404", False, f"Expected 401/404, got {resp.status_code}")
            return False
    except Exception as e:
        log_test("Delete unauthorized repo returns 401/404", False, str(e))
        return False

def test_create_issue(token: str):
    """Test 27: Create an issue"""
    try:
        resp = requests.post(f"{BASE_URL}/repos/octodev/awesome-ui-kit/issues", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "title": "Test issue from automated test",
            "body": "This is a test issue"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if 'number' in data and data.get('title') == "Test issue from automated test":
                log_test("Create issue", True)
                return data['number']
            else:
                log_test("Create issue", False, f"Missing number or title mismatch: {data}")
                return None
        else:
            log_test("Create issue", False, f"Status {resp.status_code}: {resp.text}")
            return None
    except Exception as e:
        log_test("Create issue", False, str(e))
        return None

def test_list_issues():
    """Test 28: List issues"""
    try:
        resp = requests.get(f"{BASE_URL}/repos/octodev/awesome-ui-kit/issues", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                log_test("List issues", True)
                return True
            else:
                log_test("List issues", False, "Empty or invalid response")
                return False
        else:
            log_test("List issues", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("List issues", False, str(e))
        return False

def test_filter_issues_by_state():
    """Test 29: Filter issues by state"""
    try:
        # Test open filter
        open_resp = requests.get(f"{BASE_URL}/repos/octodev/awesome-ui-kit/issues?state=open", timeout=10)
        closed_resp = requests.get(f"{BASE_URL}/repos/octodev/awesome-ui-kit/issues?state=closed", timeout=10)
        
        if open_resp.status_code == 200 and closed_resp.status_code == 200:
            open_data = open_resp.json()
            closed_data = closed_resp.json()
            
            # Verify all open issues have state=open
            open_valid = all(i.get('state') == 'open' for i in open_data)
            closed_valid = all(i.get('state') == 'closed' for i in closed_data)
            
            if open_valid and closed_valid:
                log_test("Filter issues by state (open/closed)", True)
                return True
            else:
                log_test("Filter issues by state (open/closed)", False, "State filter not working correctly")
                return False
        else:
            log_test("Filter issues by state (open/closed)", False, f"Status codes: open={open_resp.status_code}, closed={closed_resp.status_code}")
            return False
    except Exception as e:
        log_test("Filter issues by state (open/closed)", False, str(e))
        return False

def test_update_issue(token: str, issue_number: int):
    """Test 30: Update issue (close it)"""
    try:
        resp = requests.patch(f"{BASE_URL}/repos/octodev/awesome-ui-kit/issues/{issue_number}", headers={
            "Authorization": f"Bearer {token}"
        }, json={
            "state": "closed"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('state') == 'closed':
                log_test("Update issue (close)", True)
                return True
            else:
                log_test("Update issue (close)", False, f"State not closed: {data.get('state')}")
                return False
        else:
            log_test("Update issue (close)", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Update issue (close)", False, str(e))
        return False

def test_feed(token: str):
    """Test 31: Get feed"""
    try:
        resp = requests.get(f"{BASE_URL}/feed", headers={
            "Authorization": f"Bearer {token}"
        }, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                # Check required fields
                first_item = data[0]
                required_fields = ['actor', 'target', 'language', 'stars']
                if all(field in first_item for field in required_fields):
                    log_test("Get feed", True)
                    return True
                else:
                    missing = [f for f in required_fields if f not in first_item]
                    log_test("Get feed", False, f"Missing fields: {missing}")
                    return False
            else:
                log_test("Get feed", False, "Empty or invalid response")
                return False
        else:
            log_test("Get feed", False, f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_test("Get feed", False, str(e))
        return False

def main():
    """Run all tests"""
    print("=" * 80)
    print("OCTOPUSH BACKEND API COMPREHENSIVE TEST SUITE")
    print(f"Testing against: {BASE_URL}")
    print("=" * 80)
    print()
    
    # Test 1: Health
    test_health()
    
    # Test 2-7: Auth flow
    username, email, password, token = test_auth_signup()
    if username and token:
        test_auth_login(username, password)
        test_auth_login_wrong_password(username)
        test_auth_me_with_token(token)
        test_auth_me_without_token()
        test_auth_duplicate_signup(username, email)
    
    # Test 8: Demo user
    demo_token = test_demo_user_login()
    
    # Test 9-13: User endpoints
    test_get_user_profile("octodev")
    test_get_nonexistent_user()
    test_get_user_repos_anonymous()
    
    if demo_token:
        test_get_user_repos_authenticated(demo_token)
        test_update_user_profile(demo_token)
    
    # Test 14-16: Follow/unfollow
    if token:
        test_follow_user(token, "octodev")
        test_unfollow_user(token, "octodev")
    
    if demo_token:
        test_self_follow(demo_token)
    
    # Test 17-26: Repository endpoints
    repo_name = None
    owner = None
    if token:
        # Get current user for repo tests
        me_resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
        if me_resp.status_code == 200:
            owner = me_resp.json()['username']
            repo_name = test_create_repo(token)
            
            if repo_name and owner:
                test_get_repo(owner, repo_name)
                test_duplicate_repo(token, repo_name)
                test_update_repo(token, owner, repo_name)
    
    test_get_trending_repos()
    
    if token:
        stars_after_star = test_star_repo(token)
        if stars_after_star:
            test_star_idempotent(token, stars_after_star)
        test_unstar_repo(token)
    
    if token and owner and repo_name:
        test_delete_repo(token, owner, repo_name)
    
    test_delete_repo_unauthorized()
    
    # Test 27-30: Issues
    issue_number = None
    if token:
        issue_number = test_create_issue(token)
    
    test_list_issues()
    test_filter_issues_by_state()
    
    if token and issue_number:
        test_update_issue(token, issue_number)
    
    # Test 31: Feed
    if token:
        test_feed(token)
    
    # Summary
    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {len(passed_tests)}")
    print(f"❌ Failed: {len(failed_tests)}")
    print()
    
    if failed_tests:
        print("FAILED TESTS:")
        for test in failed_tests:
            print(f"  - {test}")
        print()
        sys.exit(1)
    else:
        print("🎉 ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
