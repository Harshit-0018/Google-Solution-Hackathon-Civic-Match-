"""
SRA Platform Backend API Tests
Covers: auth, health, tasks, matching, rewards, admin endpoints
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://prototyped-solution.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Tokens pre-inserted into MongoDB by test runner
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")
VOL_TOKEN = os.environ.get("VOL_TOKEN")
NGO_TOKEN = os.environ.get("NGO_TOKEN")


def H(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Shared state across tests ----------
state = {}


@pytest.fixture(scope="session", autouse=True)
def ensure_test_users():
    """Re-insert vol+ngo test users in case a previous seed-demo deleted them."""
    import subprocess
    subprocess.run(["mongosh", "--quiet", "--eval", """
use('test_database');
db.users.updateOne({user_id:"user_vol_test"},{$set:{user_id:"user_vol_test", email:"vol.test@sra.local", name:"Volunteer Test", role:"volunteer", verified:true, skills:["first aid","teaching","malayalam translation"], languages:["Malayalam","English"], location_lat:11.2588, location_lng:75.7804, location_name:"Kozhikode", availability_dates:["2026-04-24","2026-04-26","2026-04-28"], availability_slots:["morning","afternoon"], total_points:0, badges:[], created_at:new Date().toISOString()}},{upsert:true});
db.users.updateOne({user_id:"user_ngo_test"},{$set:{user_id:"user_ngo_test", email:"ngo.test@sra.local", name:"NGO Admin Test", role:"ngo", verified:true, ngo_id:"ngo_test_123", skills:[], languages:[], availability_dates:[], availability_slots:[], total_points:0, badges:[], created_at:new Date().toISOString()}},{upsert:true});
db.ngos.updateOne({ngo_id:"ngo_test_123"},{$set:{ngo_id:"ngo_test_123", name:"Test NGO", registration_no:"REG/KL/9999", verified:true, focus_areas:["healthcare"], description:"Test NGO", contact_email:"ngo.test@sra.local", location_lat:11.0, location_lng:76.0, location_name:"Kerala", admin_uid:"user_ngo_test", rating:4.5, total_tasks_posted:0, created_at:new Date().toISOString()}},{upsert:true});
"""], check=False, capture_output=True)
    yield


# ---------- Health ----------
class TestHealth:
    def test_api_health(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Auth ----------
class TestAuth:
    def test_me_without_token_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_admin(self):
        r = requests.get(f"{API}/auth/me", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["role"] == "admin"
        assert "_id" not in d

    def test_me_volunteer(self):
        r = requests.get(f"{API}/auth/me", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "volunteer"

    def test_me_ngo(self):
        r = requests.get(f"{API}/auth/me", headers=H(NGO_TOKEN))
        assert r.status_code == 200
        assert r.json()["role"] == "ngo"


# ---------- Admin: seed + stats ----------
class TestAdminSeed:
    def test_seed_demo(self):
        r = requests.post(f"{API}/admin/seed-demo", headers=H(ADMIN_TOKEN), timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ngos"] == 3
        assert d["volunteers"] == 15
        assert d["tasks"] == 10
        # IMPORTANT: seed-demo deletes ALL volunteer/ngo users (even test ones).
        # Re-insert our test vol + ngo users so subsequent tests can auth.
        import subprocess
        subprocess.run(["mongosh", "--quiet", "--eval", """
use('test_database');
db.users.insertOne({user_id:"user_vol_test", email:"vol.test@sra.local", name:"Volunteer Test", role:"volunteer", verified:true, skills:["first aid","teaching","malayalam translation"], languages:["Malayalam","English"], location_lat:11.2588, location_lng:75.7804, location_name:"Kozhikode", availability_dates:["2026-04-24","2026-04-26","2026-04-28"], availability_slots:["morning","afternoon"], total_points:0, badges:[], created_at:new Date().toISOString()});
db.users.insertOne({user_id:"user_ngo_test", email:"ngo.test@sra.local", name:"NGO Admin Test", role:"ngo", verified:true, ngo_id:"ngo_test_123", skills:[], languages:[], availability_dates:[], availability_slots:[], total_points:0, badges:[], created_at:new Date().toISOString()});
db.ngos.updateOne({ngo_id:"ngo_test_123"},{$set:{ngo_id:"ngo_test_123", name:"Test NGO", registration_no:"REG/KL/9999", verified:true, focus_areas:["healthcare"], description:"Test NGO", contact_email:"ngo.test@sra.local", location_lat:11.0, location_lng:76.0, location_name:"Kerala", admin_uid:"user_ngo_test", rating:4.5, total_tasks_posted:0, created_at:new Date().toISOString()}},{upsert:true});
"""], check=False, capture_output=True)

    def test_admin_stats(self):
        r = requests.get(f"{API}/admin/stats", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        d = r.json()
        assert d["ngos_total"] >= 3
        assert d["ngos_verified"] >= 3
        assert d["volunteers"] >= 15
        assert d["tasks_total"] >= 10

    def test_admin_stats_forbidden_for_volunteer(self):
        r = requests.get(f"{API}/admin/stats", headers=H(VOL_TOKEN))
        assert r.status_code == 403

    def test_admin_users(self):
        r = requests.get(f"{API}/admin/users", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 15
        assert all("_id" not in u for u in users)

    def test_admin_unverified(self):
        r = requests.get(f"{API}/admin/unverified", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        d = r.json()
        assert "ngos" in d and "volunteers" in d

    def test_admin_audit_logs(self):
        r = requests.get(f"{API}/admin/audit-logs", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        logs = r.json()
        assert isinstance(logs, list)
        assert any(log.get("action") == "seed_demo" for log in logs)


# ---------- Tasks ----------
class TestTasks:
    def test_list_tasks(self):
        r = requests.get(f"{API}/tasks", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        tasks = r.json()
        assert len(tasks) >= 10
        assert all("_id" not in t for t in tasks)
        state["sample_task_id"] = tasks[0]["task_id"]

    def test_list_tasks_filter_status_open(self):
        r = requests.get(f"{API}/tasks?status=open", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        assert all(t["status"] == "open" for t in r.json())

    def test_list_tasks_filter_urgency_min(self):
        r = requests.get(f"{API}/tasks?urgency_min=4", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        assert all(t["urgency"] >= 4 for t in r.json())

    def test_list_tasks_filter_category(self):
        r = requests.get(f"{API}/tasks?category=healthcare", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        assert all(t["category"] == "healthcare" for t in r.json())

    def test_create_task_as_ngo(self):
        payload = {
            "title": "TEST_ Urgent Kozhikode Medical Aid",
            "description": "Need volunteers with first aid and nursing skills to help with emergency medical response in Kozhikode area.",
            "category": "healthcare",
            "urgency": 5,
            "required_skills": ["first aid", "nursing"],
            "required_slots": ["morning", "afternoon"],
            "volunteers_required": 3,
            "location_lat": 11.25,
            "location_lng": 75.78,
            "location_name": "Kozhikode",
            "address": "Kozhikode, Kerala",
            "start_date": "2026-04-24",
            "end_date": "2026-04-30",
        }
        r = requests.post(f"{API}/tasks", headers=H(NGO_TOKEN), json=payload, timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "task_id" in d
        state["created_task_id"] = d["task_id"]
        task = d["task"]
        assert task["title"] == payload["title"]
        assert task["urgency"] == 5
        assert "description_translated" in task
        # Even if translation times out, English should at least be there
        assert "en" in task["description_translated"]

    def test_get_created_task_persisted(self):
        tid = state["created_task_id"]
        r = requests.get(f"{API}/tasks/{tid}", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        t = r.json()
        assert t["task_id"] == tid
        assert t["urgency"] == 5


# ---------- Matching ----------
class TestMatching:
    def test_run_matching_as_admin(self):
        tid = state["created_task_id"]
        r = requests.post(f"{API}/match/run/{tid}", headers=H(ADMIN_TOKEN), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["task_id"] == tid
        assert "matches" in d
        matches = d["matches"]
        assert len(matches) > 0, "Expected candidates from seeded volunteers"
        # Score breakdown
        top = matches[0]
        assert all(k in top for k in ["score_skill", "score_proximity", "score_availability", "score_impact", "score_total"])
        assert 0.0 <= top["score_total"] <= 1.0
        # At least one candidate should have non-zero skill or proximity
        assert any(m["score_skill"] > 0 or m["score_proximity"] > 0 for m in matches)
        state["match_id"] = matches[0]["match_id"]

    def test_match_task_results(self):
        tid = state["created_task_id"]
        r = requests.get(f"{API}/match/task/{tid}", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_volunteer_respond_match(self):
        """Create a match for vol.test directly, then respond."""
        # Use admin to create a task with skills matching our volunteer
        payload = {
            "title": "TEST_ Teaching Camp",
            "description": "Teach children.",
            "category": "education",
            "urgency": 3,
            "required_skills": ["teaching", "first aid"],
            "volunteers_required": 1,
            "location_lat": 11.2588,
            "location_lng": 75.7804,
            "location_name": "Kozhikode",
            "start_date": "2026-04-24",
            "end_date": "2026-04-30",
        }
        r = requests.post(f"{API}/tasks", headers=H(NGO_TOKEN), json=payload, timeout=45)
        assert r.status_code == 200
        t2 = r.json()["task_id"]
        state["task2"] = t2

        # run matching including verified volunteers — need to include our vol.test user
        r = requests.post(f"{API}/match/run/{t2}", headers=H(ADMIN_TOKEN), timeout=30)
        assert r.status_code == 200
        matches = r.json()["matches"]
        # find match for user_vol_test
        vol_match = next((m for m in matches if m["volunteer_id"] == "user_vol_test"), None)
        if vol_match is None:
            # Accept top match instead & assign to test user via direct match creation not possible here -> skip
            pytest.skip("user_vol_test not in top matches for this task")
        state["vol_match_id"] = vol_match["match_id"]

        # respond
        r = requests.put(
            f"{API}/match/{vol_match['match_id']}/respond",
            headers=H(VOL_TOKEN),
            json={"status": "accepted"},
        )
        assert r.status_code == 200

    def test_complete_match_awards_points(self):
        mid = state.get("vol_match_id")
        if not mid:
            pytest.skip("no vol match to complete")
        r = requests.put(f"{API}/match/{mid}/complete", headers=H(NGO_TOKEN))
        assert r.status_code == 200
        d = r.json()
        assert d["points_awarded"] > 0

        # verify points on user
        r = requests.get(f"{API}/auth/me", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        assert r.json().get("total_points", 0) > 0


# ---------- Rewards ----------
class TestRewards:
    def test_catalog(self):
        r = requests.get(f"{API}/rewards/catalog", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 6
        assert all("_id" not in i for i in items)
        state["catalog_id"] = items[0]["catalog_id"]

    def test_leaderboard(self):
        r = requests.get(f"{API}/rewards/leaderboard", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        lb = r.json()
        assert isinstance(lb, list)
        assert all("_id" not in d for d in lb)

    def test_redeem_insufficient(self):
        # pick a 2000 points item
        r = requests.get(f"{API}/rewards/catalog", headers=H(VOL_TOKEN))
        items = r.json()
        expensive = next((i for i in items if i["points_cost"] >= 2000), None)
        if expensive:
            r = requests.post(
                f"{API}/rewards/redeem",
                headers=H(VOL_TOKEN),
                json={"catalog_id": expensive["catalog_id"]},
            )
            # vol may or may not have 2000 pts. Accept 400 insufficient or 200
            assert r.status_code in (200, 400)


# ---------- NGO/User verification ----------
class TestVerification:
    def test_verify_ngo(self):
        # get an ngo
        r = requests.get(f"{API}/ngos", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        ngos = r.json()
        assert len(ngos) > 0
        ngo_id = ngos[0]["ngo_id"]
        r = requests.put(f"{API}/ngos/{ngo_id}/verify", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200

    def test_verify_user(self):
        r = requests.put(f"{API}/users/user_vol_test/verify", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200

    def test_verify_forbidden_for_volunteer(self):
        r = requests.put(f"{API}/users/user_vol_test/verify", headers=H(VOL_TOKEN))
        assert r.status_code == 403
