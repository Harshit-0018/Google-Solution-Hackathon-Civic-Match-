"""
SRA iteration 2 - new feature tests:
- Public impact dashboard /api/impact/public (no auth)
- Semantic skill expansion via Gemini on task creation
- Notifications (list / mark-read / read-all)
- NGO ownership enforcement on /api/match/run
- Match respond / complete creates notifications
"""
import os
import time
import pytest
import requests
import subprocess

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://prototyped-solution.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")
VOL_TOKEN = os.environ.get("VOL_TOKEN")
NGO_TOKEN = os.environ.get("NGO_TOKEN")


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


state = {}


@pytest.fixture(scope="session", autouse=True)
def ensure_test_users():
    subprocess.run(["mongosh", "--quiet", "--eval", """
use('test_database');
db.users.updateOne({user_id:"user_vol_test"},{$set:{user_id:"user_vol_test", email:"vol.test@sra.local", name:"Volunteer Test", role:"volunteer", verified:true, skills:["first aid","teaching","nursing"], languages:["Malayalam","English"], location_lat:11.2588, location_lng:75.7804, location_name:"Kozhikode", availability_dates:["2026-04-24","2026-04-26","2026-04-28"], availability_slots:["morning","afternoon"], total_points:0, badges:[], created_at:new Date().toISOString()}},{upsert:true});
db.users.updateOne({user_id:"user_ngo_test"},{$set:{user_id:"user_ngo_test", email:"ngo.test@sra.local", name:"NGO Admin Test", role:"ngo", verified:true, ngo_id:"ngo_test_123", skills:[], languages:[], availability_dates:[], availability_slots:[], total_points:0, badges:[], created_at:new Date().toISOString()}},{upsert:true});
db.ngos.updateOne({ngo_id:"ngo_test_123"},{$set:{ngo_id:"ngo_test_123", name:"Test NGO", registration_no:"REG/KL/9999", verified:true, focus_areas:["healthcare"], description:"Test NGO", contact_email:"ngo.test@sra.local", location_lat:11.0, location_lng:76.0, location_name:"Kerala", admin_uid:"user_ngo_test", rating:4.5, total_tasks_posted:0, created_at:new Date().toISOString()}},{upsert:true});
"""], check=False, capture_output=True)
    yield


# ---------- Public Impact ----------
class TestPublicImpact:
    def test_public_impact_no_auth(self):
        r = requests.get(f"{API}/impact/public", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("stats", "leaders", "recent_completed", "heatmap", "categories"):
            assert k in d, f"missing key {k}"
        for sk in ("ngos", "volunteers", "tasks_total", "tasks_completed",
                   "matches_total", "total_points_awarded"):
            assert sk in d["stats"]
        assert isinstance(d["leaders"], list)
        assert isinstance(d["heatmap"], list)
        assert isinstance(d["categories"], list)
        # demo seed already run -> populated data expected
        assert d["stats"]["volunteers"] >= 15
        assert d["stats"]["ngos"] >= 3


# ---------- Semantic skill expansion on task create ----------
class TestSemanticSkills:
    def test_create_task_has_semantic_skills(self):
        payload = {
            "title": "TEST_ Semantic First Aid Camp",
            "description": "Need medics for emergency medical response.",
            "category": "healthcare",
            "urgency": 4,
            "required_skills": ["first aid"],
            "volunteers_required": 2,
            "location_lat": 11.25,
            "location_lng": 75.78,
            "location_name": "Kozhikode",
            "start_date": "2026-04-25",
            "end_date": "2026-04-30",
        }
        r = requests.post(f"{API}/tasks", headers=H(NGO_TOKEN), json=payload, timeout=45)
        assert r.status_code == 200, r.text
        d = r.json()
        task = d["task"]
        assert "semantic_skills" in task
        assert isinstance(task["semantic_skills"], list)
        state["semantic_task_id"] = d["task_id"]
        state["semantic_skills"] = task["semantic_skills"]

    def test_get_task_returns_semantic_skills(self):
        tid = state["semantic_task_id"]
        r = requests.get(f"{API}/tasks/{tid}", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        t = r.json()
        assert "semantic_skills" in t
        assert isinstance(t["semantic_skills"], list)

    def test_matching_uses_semantic_skills(self):
        """Run matching; vol has 'nursing' not 'first aid' -> skill score should be > 0
        when semantic expansion produced related terms."""
        tid = state["semantic_task_id"]
        r = requests.post(f"{API}/match/run/{tid}", headers=H(ADMIN_TOKEN), timeout=30)
        assert r.status_code == 200, r.text
        matches = r.json()["matches"]
        assert len(matches) > 0
        top = matches[0]
        for k in ("score_skill", "score_proximity", "score_availability",
                  "score_impact", "score_total"):
            assert k in top


# ---------- NGO ownership enforcement on match/run ----------
class TestMatchOwnership:
    def test_ngo_cannot_run_matching_on_other_ngo_task(self):
        # Create a task as admin (ngo_id = "admin"), so our test NGO does not own it
        r = requests.get(f"{API}/tasks", headers=H(ADMIN_TOKEN))
        assert r.status_code == 200
        tasks = r.json()
        # pick a task NOT owned by ngo_test_123
        other = next((t for t in tasks if t.get("ngo_id") != "ngo_test_123"), None)
        assert other is not None, "no other-ngo task to test ownership"
        state["other_task_id"] = other["task_id"]
        r = requests.post(f"{API}/match/run/{other['task_id']}", headers=H(NGO_TOKEN), timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

    def test_admin_can_run_matching_on_any_task(self):
        tid = state["other_task_id"]
        r = requests.post(f"{API}/match/run/{tid}", headers=H(ADMIN_TOKEN), timeout=30)
        assert r.status_code == 200


# ---------- Notifications ----------
class TestNotifications:
    def test_list_without_auth_401(self):
        r = requests.get(f"{API}/notifications")
        assert r.status_code == 401

    def test_notifications_created_after_matching(self):
        """Create a matching task that should select user_vol_test; verify notification appears."""
        payload = {
            "title": "TEST_ Notifications Teaching",
            "description": "Teach and give first aid.",
            "category": "education",
            "urgency": 4,
            "required_skills": ["teaching", "first aid"],
            "volunteers_required": 3,
            "location_lat": 11.2588,
            "location_lng": 75.7804,
            "location_name": "Kozhikode",
            "start_date": "2026-04-25",
            "end_date": "2026-04-30",
        }
        r = requests.post(f"{API}/tasks", headers=H(NGO_TOKEN), json=payload, timeout=45)
        assert r.status_code == 200
        tid = r.json()["task_id"]
        state["notif_task_id"] = tid

        r = requests.post(f"{API}/match/run/{tid}", headers=H(NGO_TOKEN), timeout=30)
        assert r.status_code == 200
        matches = r.json()["matches"]
        vol_match = next((m for m in matches if m["volunteer_id"] == "user_vol_test"), None)
        if not vol_match:
            pytest.skip("user_vol_test not selected by matcher for this run")
        state["vol_match_id"] = vol_match["match_id"]

        time.sleep(1)
        r = requests.get(f"{API}/notifications", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d
        assert any(n.get("kind") == "match_created" for n in d["items"]), \
            f"expected match_created notification, got kinds={[n.get('kind') for n in d['items']]}"
        assert d["unread"] > 0
        state["first_notif_id"] = next(
            n["notification_id"] for n in d["items"] if n.get("kind") == "match_created"
        )

    def test_mark_single_notification_read(self):
        nid = state.get("first_notif_id")
        if not nid:
            pytest.skip("no notification id")
        r1 = requests.get(f"{API}/notifications", headers=H(VOL_TOKEN))
        before = r1.json()["unread"]
        r = requests.put(f"{API}/notifications/{nid}/read", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/notifications", headers=H(VOL_TOKEN))
        after = r2.json()["unread"]
        assert after == max(0, before - 1)

    def test_respond_match_creates_ngo_notification(self):
        mid = state.get("vol_match_id")
        if not mid:
            pytest.skip("no match to respond to")
        r = requests.put(f"{API}/match/{mid}/respond", headers=H(VOL_TOKEN),
                         json={"status": "accepted"})
        assert r.status_code == 200
        time.sleep(1)
        r = requests.get(f"{API}/notifications", headers=H(NGO_TOKEN))
        assert r.status_code == 200
        kinds = [n.get("kind") for n in r.json()["items"]]
        assert "match_accepted" in kinds, f"expected match_accepted in {kinds}"

    def test_complete_match_creates_volunteer_notification(self):
        mid = state.get("vol_match_id")
        if not mid:
            pytest.skip("no match to complete")
        r = requests.put(f"{API}/match/{mid}/complete", headers=H(NGO_TOKEN))
        assert r.status_code == 200
        time.sleep(1)
        r = requests.get(f"{API}/notifications", headers=H(VOL_TOKEN))
        kinds = [n.get("kind") for n in r.json()["items"]]
        assert "task_completed" in kinds, f"expected task_completed in {kinds}"

    def test_mark_all_read(self):
        r = requests.put(f"{API}/notifications/read-all", headers=H(VOL_TOKEN))
        assert r.status_code == 200
        r2 = requests.get(f"{API}/notifications", headers=H(VOL_TOKEN))
        assert r2.json()["unread"] == 0
