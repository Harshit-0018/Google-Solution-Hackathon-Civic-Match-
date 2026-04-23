"""
Iteration 3 backend tests covering:
- Google Forms pipeline (ingest, admin list/publish/discard)
- Admin redemptions (list/filter/fulfill)
- Task applicants (apply as volunteer, list as NGO owner only)
- Two-way ratings (ngo_rating 5-star bonus, volunteer_rating)
- Badges: speed_volunteer, skill_champion (per-category), multilingual
- Profile edit: PUT /users/me, PUT /ngos/me

Self-bootstrapping fixtures re-upsert test users & sessions via mongosh.
Env: REACT_APP_BACKEND_URL, optional ADMIN_TOKEN/VOL_TOKEN/NGO_TOKEN
"""
import os
import subprocess
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # read from frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL required"

API = f"{BASE_URL}/api"
PIPELINE_SECRET = os.environ.get("PIPELINE_SECRET", "demo-pipeline-secret")


def _mongosh_seed():
    """Seed test users + sessions directly via mongosh; return tokens."""
    admin_t = f"test_admin_{int(time.time()*1000)}"
    vol_t = f"test_vol_{int(time.time()*1000)}"
    ngo_t = f"test_ngo_{int(time.time()*1000)}"
    script = f"""
use('test_database');
db.users.updateOne({{user_id:'user_admin_test'}},{{$set:{{user_id:'user_admin_test',email:'admin.test@sra.local',name:'Admin Test',role:'admin',verified:true,total_points:0,badges:[],skills:[],languages:[],availability_dates:[],availability_slots:[],created_at:new Date().toISOString()}}}},{{upsert:true}});
db.user_sessions.insertOne({{user_id:'user_admin_test',session_token:'{admin_t}',expires_at:new Date(Date.now()+7*24*3600*1000).toISOString(),created_at:new Date().toISOString()}});
db.users.updateOne({{user_id:'user_vol_test'}},{{$set:{{user_id:'user_vol_test',email:'vol.test@sra.local',name:'Volunteer Test',role:'volunteer',verified:true,skills:['first aid','teaching','malayalam translation'],languages:['Malayalam','English'],location_lat:11.2588,location_lng:75.7804,location_name:'Kozhikode',availability_dates:['2026-04-24'],availability_slots:['morning','afternoon'],total_points:0,badges:[],created_at:new Date().toISOString()}}}},{{upsert:true}});
db.user_sessions.insertOne({{user_id:'user_vol_test',session_token:'{vol_t}',expires_at:new Date(Date.now()+7*24*3600*1000).toISOString(),created_at:new Date().toISOString()}});
db.users.updateOne({{user_id:'user_ngo_test'}},{{$set:{{user_id:'user_ngo_test',email:'ngo.test@sra.local',name:'NGO Admin Test',role:'ngo',verified:true,ngo_id:'ngo_test_123',skills:[],languages:[],availability_dates:[],availability_slots:[],total_points:0,badges:[],created_at:new Date().toISOString()}}}},{{upsert:true}});
db.ngos.updateOne({{ngo_id:'ngo_test_123'}},{{$set:{{ngo_id:'ngo_test_123',name:'Test NGO',registration_no:'REG/KL/9999',verified:true,focus_areas:['healthcare'],description:'Test NGO',contact_email:'ngo.test@sra.local',location_lat:11.0,location_lng:76.0,location_name:'Kerala',admin_uid:'user_ngo_test',rating:4.5,total_tasks_posted:0,created_at:new Date().toISOString()}}}},{{upsert:true}});
db.user_sessions.insertOne({{user_id:'user_ngo_test',session_token:'{ngo_t}',expires_at:new Date(Date.now()+7*24*3600*1000).toISOString(),created_at:new Date().toISOString()}});
"""
    subprocess.run(["mongosh", "--quiet", "--eval", script], check=True, capture_output=True)
    return admin_t, vol_t, ngo_t


@pytest.fixture(scope="session")
def tokens():
    a = os.environ.get("ADMIN_TOKEN")
    v = os.environ.get("VOL_TOKEN")
    n = os.environ.get("NGO_TOKEN")
    if not (a and v and n):
        a, v, n = _mongosh_seed()
    # verify
    for t, role in [(a, "admin"), (v, "volunteer"), (n, "ngo")]:
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {t}"}, timeout=15)
        if r.status_code != 200 or r.json().get("role") != role:
            a, v, n = _mongosh_seed()
            break
    return {"admin": a, "vol": v, "ngo": n}


def H(t):
    return {"Authorization": f"Bearer {t}", "Content-Type": "application/json"}


# ================== PIPELINE TESTS ==================

class TestPipeline:
    def test_ingest_requires_secret(self):
        r = requests.post(f"{API}/pipeline/ingest",
                          json={"description": "x"},
                          headers={"X-Pipeline-Secret": "wrong"}, timeout=15)
        assert r.status_code == 403

    def test_ingest_creates_submission(self, tokens):
        body = {
            "area": "Kozhikode",
            "category": "healthcare",
            "description": "TEST_P: 20 elderly need medicines after cyclone warning in coastal Kozhikode.",
            "urgency": 4,
            "affected_count": 20,
            "contact": "+91-9000000001",
            "raw_location": "Kozhikode Beach Road",
        }
        r = requests.post(f"{API}/pipeline/ingest", json=body,
                          headers={"X-Pipeline-Secret": PIPELINE_SECRET}, timeout=45)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert data.get("submission_id", "").startswith("pipe_")
        pytest.submission_id = data["submission_id"]

    def test_admin_list_pipeline(self, tokens):
        r = requests.get(f"{API}/admin/pipeline", headers=H(tokens["admin"]), timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 1
        found = next((i for i in items if i["submission_id"] == pytest.submission_id), None)
        assert found is not None
        assert found["status"] == "pending"
        assert "description_translated" in found
        assert "suggested_skills" in found

    def test_admin_list_pipeline_filter_pending(self, tokens):
        r = requests.get(f"{API}/admin/pipeline?status=pending", headers=H(tokens["admin"]), timeout=15)
        assert r.status_code == 200
        for it in r.json():
            assert it["status"] == "pending"

    def test_admin_publish_creates_task(self, tokens):
        # create a second submission to publish
        body = {
            "area": "Kochi",
            "category": "education",
            "description": "TEST_P2: Coaching volunteers for Class 10 students displaced by floods.",
            "urgency": 3,
        }
        r = requests.post(f"{API}/pipeline/ingest", json=body,
                          headers={"X-Pipeline-Secret": PIPELINE_SECRET}, timeout=45)
        assert r.status_code == 200
        sid = r.json()["submission_id"]

        pub = requests.post(
            f"{API}/admin/pipeline/{sid}/publish",
            headers=H(tokens["admin"]),
            json={"ngo_id": "ngo_test_123", "title": "TEST_P2 Published Task", "volunteers_required": 3},
            timeout=30,
        )
        assert pub.status_code == 200, pub.text
        pdata = pub.json()
        assert pdata.get("ok") is True
        task_id = pdata["task_id"]
        # verify task actually exists
        t = requests.get(f"{API}/tasks/{task_id}", headers=H(tokens["admin"]), timeout=15)
        assert t.status_code == 200
        td = t.json()
        assert td["title"] == "TEST_P2 Published Task"
        assert td["ngo_id"] == "ngo_test_123"
        assert td.get("source") == "google_forms_pipeline"
        # submission marked published
        lst = requests.get(f"{API}/admin/pipeline", headers=H(tokens["admin"]), timeout=15).json()
        sub = next(i for i in lst if i["submission_id"] == sid)
        assert sub["status"] == "published"
        assert sub.get("task_id") == task_id

    def test_admin_discard(self, tokens):
        body = {"description": "TEST_P3: discard me"}
        r = requests.post(f"{API}/pipeline/ingest", json=body,
                          headers={"X-Pipeline-Secret": PIPELINE_SECRET}, timeout=45)
        sid = r.json()["submission_id"]
        d = requests.post(f"{API}/admin/pipeline/{sid}/discard", headers=H(tokens["admin"]), timeout=15)
        assert d.status_code == 200
        lst = requests.get(f"{API}/admin/pipeline", headers=H(tokens["admin"]), timeout=15).json()
        sub = next(i for i in lst if i["submission_id"] == sid)
        assert sub["status"] == "discarded"


# ================== REDEMPTIONS ==================

class TestRedemptions:
    def test_admin_list_and_fulfill(self, tokens):
        # give volunteer enough points by completing a task? simpler: bump points then redeem
        # fetch catalog
        cat = requests.get(f"{API}/rewards/catalog", headers=H(tokens["vol"]), timeout=15).json()
        assert isinstance(cat, list) and len(cat) > 0
        item = min(cat, key=lambda x: x.get("points_cost", 99999))
        # ensure points
        subprocess.run(["mongosh", "--quiet", "--eval",
                        f"use('test_database'); db.users.updateOne({{user_id:'user_vol_test'}},{{$set:{{total_points:5000}}}});"],
                       check=True, capture_output=True)
        redeem = requests.post(f"{API}/rewards/redeem", headers=H(tokens["vol"]),
                               json={"catalog_id": item["catalog_id"]}, timeout=15)
        assert redeem.status_code == 200, redeem.text
        reward_id = redeem.json()["reward_id"]

        # list fulfilled=false
        lst = requests.get(f"{API}/admin/redemptions?fulfilled=false", headers=H(tokens["admin"]), timeout=15)
        assert lst.status_code == 200
        ids = [r["reward_id"] for r in lst.json()]
        assert reward_id in ids

        # fulfill
        ff = requests.put(f"{API}/admin/redemptions/{reward_id}/fulfill",
                          headers=H(tokens["admin"]), timeout=15)
        assert ff.status_code == 200
        # verify fulfilled=true now
        lst2 = requests.get(f"{API}/admin/redemptions?fulfilled=true", headers=H(tokens["admin"]), timeout=15).json()
        found = next((r for r in lst2 if r["reward_id"] == reward_id), None)
        assert found is not None and found["fulfilled"] is True
        assert found.get("fulfilled_by") == "user_admin_test"

        # volunteer notification created
        notifs = requests.get(f"{API}/notifications", headers=H(tokens["vol"]), timeout=15).json()
        items = notifs.get("items", notifs) if isinstance(notifs, dict) else notifs
        assert any(n.get("kind") == "redemption_fulfilled" for n in items)


# ================== APPLICANTS ==================

class TestApplicants:
    def _create_task(self, tokens):
        body = {
            "title": f"TEST_APP_{uuid.uuid4().hex[:6]}",
            "description": "Applicant test task",
            "category": "healthcare",
            "urgency": 3,
            "required_skills": ["first aid"],
            "required_slots": ["morning"],
            "volunteers_required": 2,
            "location_lat": 11.0,
            "location_lng": 76.0,
            "location_name": "Kerala",
            "address": "Test",
            "start_date": "2026-05-01",
            "end_date": "2026-05-10",
        }
        r = requests.post(f"{API}/tasks", headers=H(tokens["ngo"]), json=body, timeout=45)
        assert r.status_code == 200, r.text
        return r.json()["task_id"]

    def test_apply_and_list_applicants(self, tokens):
        task_id = self._create_task(tokens)
        a = requests.post(f"{API}/tasks/{task_id}/apply", headers=H(tokens["vol"]), timeout=15)
        assert a.status_code == 200
        # NGO owner can see
        l = requests.get(f"{API}/tasks/{task_id}/applicants", headers=H(tokens["ngo"]), timeout=15)
        assert l.status_code == 200
        arr = l.json()
        assert any(u["user_id"] == "user_vol_test" for u in arr)
        u = next(u for u in arr if u["user_id"] == "user_vol_test")
        assert u.get("name") == "Volunteer Test"
        assert "skills" in u

    def test_non_owner_ngo_gets_403(self, tokens):
        task_id = self._create_task(tokens)
        # create a rogue NGO user
        rogue_token = f"test_rogue_{int(time.time()*1000)}"
        subprocess.run(["mongosh", "--quiet", "--eval", f"""
use('test_database');
db.users.updateOne({{user_id:'user_rogue_ngo'}},{{$set:{{user_id:'user_rogue_ngo',email:'rogue@sra.local',name:'Rogue NGO',role:'ngo',verified:true,ngo_id:'ngo_other',skills:[],languages:[],availability_dates:[],availability_slots:[],total_points:0,badges:[],created_at:new Date().toISOString()}}}},{{upsert:true}});
db.ngos.updateOne({{ngo_id:'ngo_other'}},{{$set:{{ngo_id:'ngo_other',name:'Other',admin_uid:'user_rogue_ngo',verified:true,created_at:new Date().toISOString()}}}},{{upsert:true}});
db.user_sessions.insertOne({{user_id:'user_rogue_ngo',session_token:'{rogue_token}',expires_at:new Date(Date.now()+7*24*3600*1000).toISOString(),created_at:new Date().toISOString()}});
"""], check=True, capture_output=True)
        r = requests.get(f"{API}/tasks/{task_id}/applicants", headers=H(rogue_token), timeout=15)
        assert r.status_code == 403


# ================== RATING + BADGES ==================

class TestRatingAndBadges:
    def _make_completed_match(self, tokens, category="healthcare"):
        # create a task
        body = {
            "title": f"TEST_RATE_{uuid.uuid4().hex[:6]}",
            "description": "Rate test",
            "category": category,
            "urgency": 3,
            "required_skills": [],
            "required_slots": ["morning"],
            "volunteers_required": 1,
            "location_lat": 11.0, "location_lng": 76.0,
            "location_name": "Kerala", "address": "x",
            "start_date": "2026-05-01", "end_date": "2026-05-10",
        }
        r = requests.post(f"{API}/tasks", headers=H(tokens["ngo"]), json=body, timeout=45)
        task_id = r.json()["task_id"]
        # directly create match in db so we don't depend on matcher
        match_id = f"match_{uuid.uuid4().hex[:10]}"
        subprocess.run(["mongosh", "--quiet", "--eval", f"""
use('test_database');
db.matches.insertOne({{match_id:'{match_id}',task_id:'{task_id}',task_title:'rate',volunteer_id:'user_vol_test',ngo_id:'ngo_test_123',status:'accepted',score_total:0.9,created_at:new Date().toISOString()}});
"""], check=True, capture_output=True)
        # complete it as NGO
        c = requests.put(f"{API}/match/{match_id}/complete", headers=H(tokens["ngo"]), timeout=15)
        assert c.status_code == 200, c.text
        return task_id, match_id

    def test_ngo_5star_rating_awards_bonus(self, tokens):
        _, match_id = self._make_completed_match(tokens)
        before = requests.get(f"{API}/auth/me", headers=H(tokens["vol"]), timeout=15).json()
        before_pts = before.get("total_points", 0)
        r = requests.put(f"{API}/match/{match_id}/rate", headers=H(tokens["ngo"]),
                         json={"rating": 5}, timeout=15)
        assert r.status_code == 200
        after = requests.get(f"{API}/auth/me", headers=H(tokens["vol"]), timeout=15).json()
        assert after["total_points"] - before_pts == 50
        # match doc has ngo_rating=5
        # verify via direct fetch
        m = subprocess.run(["mongosh", "--quiet", "--eval",
                            f"use('test_database'); printjson(db.matches.findOne({{match_id:'{match_id}'}},{{ngo_rating:1,_id:0}}));"],
                           capture_output=True, text=True)
        assert "ngo_rating" in m.stdout and "5" in m.stdout

    def test_volunteer_rating(self, tokens):
        _, match_id = self._make_completed_match(tokens)
        r = requests.put(f"{API}/match/{match_id}/rate", headers=H(tokens["vol"]),
                         json={"rating": 4}, timeout=15)
        assert r.status_code == 200
        m = subprocess.run(["mongosh", "--quiet", "--eval",
                            f"use('test_database'); printjson(db.matches.findOne({{match_id:'{match_id}'}},{{volunteer_rating:1,_id:0}}));"],
                           capture_output=True, text=True)
        assert "volunteer_rating" in m.stdout and "4" in m.stdout

    def test_speed_volunteer_badge(self, tokens):
        # clear existing badge
        subprocess.run(["mongosh", "--quiet", "--eval",
                        "use('test_database'); db.users.updateOne({user_id:'user_vol_test'},{$set:{badges:[]}});"],
                       check=True, capture_output=True)
        # create a match timestamped now, volunteer accepts
        match_id = f"match_{uuid.uuid4().hex[:10]}"
        task_id = f"task_{uuid.uuid4().hex[:10]}"
        subprocess.run(["mongosh", "--quiet", "--eval", f"""
use('test_database');
db.tasks.insertOne({{task_id:'{task_id}',ngo_id:'ngo_test_123',title:'speed',status:'open',urgency:3,category:'other',volunteers_matched:0,volunteers_required:1,created_at:new Date().toISOString()}});
db.matches.insertOne({{match_id:'{match_id}',task_id:'{task_id}',task_title:'speed',volunteer_id:'user_vol_test',ngo_id:'ngo_test_123',status:'matched',score_total:0.5,created_at:new Date().toISOString()}});
"""], check=True, capture_output=True)
        r = requests.put(f"{API}/match/{match_id}/respond", headers=H(tokens["vol"]),
                         json={"status": "accepted"}, timeout=15)
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=H(tokens["vol"]), timeout=15).json()
        assert "speed_volunteer" in me.get("badges", [])

    def test_multilingual_badge_on_complete(self, tokens):
        # remove multilingual badge first
        subprocess.run(["mongosh", "--quiet", "--eval",
                        "use('test_database'); db.users.updateOne({user_id:'user_vol_test'},{$pull:{badges:'multilingual'}});"],
                       check=True, capture_output=True)
        # create task with translations directly
        task_id = f"task_{uuid.uuid4().hex[:10]}"
        match_id = f"match_{uuid.uuid4().hex[:10]}"
        subprocess.run(["mongosh", "--quiet", "--eval", f"""
use('test_database');
db.tasks.insertOne({{task_id:'{task_id}',ngo_id:'ngo_test_123',title:'ml',status:'open',urgency:2,category:'other',volunteers_matched:0,volunteers_required:1,description:'x',description_translated:{{en:'x',hi:'ex',ml:'el'}},created_at:new Date().toISOString()}});
db.matches.insertOne({{match_id:'{match_id}',task_id:'{task_id}',task_title:'ml',volunteer_id:'user_vol_test',ngo_id:'ngo_test_123',status:'accepted',score_total:0.5,created_at:new Date().toISOString()}});
"""], check=True, capture_output=True)
        r = requests.put(f"{API}/match/{match_id}/complete", headers=H(tokens["ngo"]), timeout=15)
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=H(tokens["vol"]), timeout=15).json()
        assert "multilingual" in me.get("badges", [])

    def test_skill_champion_per_category(self, tokens):
        # create 5 completed matches in the same category 'education'
        subprocess.run(["mongosh", "--quiet", "--eval",
                        "use('test_database'); db.users.updateOne({user_id:'user_vol_test'},{$pull:{badges:'skill_champion'}});"],
                       check=True, capture_output=True)
        match_ids = []
        for i in range(5):
            task_id = f"task_edu_{uuid.uuid4().hex[:8]}"
            match_id = f"match_edu_{uuid.uuid4().hex[:8]}"
            subprocess.run(["mongosh", "--quiet", "--eval", f"""
use('test_database');
db.tasks.insertOne({{task_id:'{task_id}',ngo_id:'ngo_test_123',title:'edu{i}',status:'open',urgency:2,category:'education',volunteers_matched:0,volunteers_required:1,description:'e',created_at:new Date().toISOString()}});
db.matches.insertOne({{match_id:'{match_id}',task_id:'{task_id}',task_title:'edu{i}',volunteer_id:'user_vol_test',ngo_id:'ngo_test_123',status:'accepted',score_total:0.5,created_at:new Date().toISOString()}});
"""], check=True, capture_output=True)
            match_ids.append(match_id)
        for mid in match_ids:
            c = requests.put(f"{API}/match/{mid}/complete", headers=H(tokens["ngo"]), timeout=20)
            assert c.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=H(tokens["vol"]), timeout=15).json()
        assert "skill_champion" in me.get("badges", [])


# ================== PROFILE EDITS ==================

class TestProfileEdits:
    def test_put_users_me(self, tokens):
        body = {
            "name": "Volunteer Test Updated",
            "skills": ["first aid", "teaching", "cooking"],
            "languages": ["Malayalam", "English", "Tamil"],
            "availability_slots": ["morning", "evening"],
            "location_lat": 10.0, "location_lng": 76.5, "location_name": "Kochi",
        }
        r = requests.put(f"{API}/users/me", headers=H(tokens["vol"]), json=body, timeout=15)
        assert r.status_code == 200
        # verify persistence
        me = requests.get(f"{API}/auth/me", headers=H(tokens["vol"]), timeout=15).json()
        assert me["name"] == "Volunteer Test Updated"
        assert "cooking" in me["skills"]
        assert me["location_name"] == "Kochi"
        assert "evening" in me["availability_slots"]

    def test_put_ngos_me(self, tokens):
        body = {
            "name": "Test NGO Updated",
            "description": "Updated desc",
            "focus_areas": ["healthcare", "education"],
            "location_lat": 11.5, "location_lng": 75.8, "location_name": "Kozhikode",
        }
        r = requests.put(f"{API}/ngos/me", headers=H(tokens["ngo"]), json=body, timeout=15)
        assert r.status_code == 200
        # GET to verify persistence
        n = requests.get(f"{API}/ngos/ngo_test_123", headers=H(tokens["ngo"]), timeout=15).json()
        assert n["name"] == "Test NGO Updated"
        assert "education" in n["focus_areas"]
        assert n["location_name"] == "Kozhikode"

    def test_put_ngos_me_forbidden_for_volunteer(self, tokens):
        r = requests.put(f"{API}/ngos/me", headers=H(tokens["vol"]),
                         json={"name": "hack"}, timeout=15)
        assert r.status_code == 403
