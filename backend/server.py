"""
Smart Resource Allocation - FastAPI Backend
Google Solution Challenge Hackathon
Stack: FastAPI + MongoDB + Emergent Google OAuth + Gemini
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
import uuid
import random
import asyncio
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="Smart Resource Allocation API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================== MODELS ==================

class UserBase(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: Optional[str] = None  # volunteer | ngo | admin
    phone: Optional[str] = None
    verified: bool = False
    # volunteer fields
    skills: List[str] = []
    languages: List[str] = []
    experience: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    availability_dates: List[str] = []
    availability_slots: List[str] = []
    total_points: int = 0
    badges: List[str] = []
    # ngo fields
    ngo_id: Optional[str] = None
    registration_no: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NGOModel(BaseModel):
    ngo_id: str
    name: str
    registration_no: str
    verified: bool = False
    focus_areas: List[str] = []
    description: str = ""
    website: Optional[str] = None
    contact_email: str
    location_lat: float
    location_lng: float
    location_name: str
    admin_uid: str
    rating: float = 0.0
    total_tasks_posted: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TaskModel(BaseModel):
    task_id: str
    ngo_id: str
    ngo_name: str
    title: str
    description: str
    description_translated: Dict[str, str] = {}
    urgency: int = 3
    urgency_score: float = 0.0
    category: str = "other"
    required_skills: List[str] = []
    required_slots: List[str] = []
    location_lat: float
    location_lng: float
    location_name: str
    address: str = ""
    volunteers_required: int = 1
    volunteers_matched: int = 0
    start_date: str
    end_date: str
    status: str = "open"  # open | matching | active | completed | cancelled
    applicants: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MatchModel(BaseModel):
    match_id: str
    task_id: str
    task_title: str
    volunteer_id: str
    volunteer_name: str
    ngo_id: str
    score_total: float
    score_skill: float
    score_proximity: float
    score_availability: float
    score_impact: float
    distance_km: float
    status: str = "pending"  # pending | accepted | declined | completed
    matched_by: str
    volunteer_response: Optional[str] = None
    ngo_rating: Optional[int] = None
    volunteer_rating: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ================== HELPERS ==================

def now_utc():
    return datetime.now(timezone.utc)


def serialize_dt(d: dict):
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    if None in (lat1, lng1, lat2, lng2):
        return 100.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlng/2)**2
    return 2*R*math.asin(math.sqrt(a))


def normalize_tokens(items: List[str]):
    out = set()
    for t in items or []:
        for tok in t.lower().replace(',', ' ').replace('/', ' ').split():
            tok = tok.strip()
            if len(tok) > 1:
                out.add(tok)
    return out


def skill_similarity(required: List[str], volunteer: List[str], semantic: Optional[List[str]] = None) -> float:
    """Jaccard-like similarity + exact-match bonus + semantic expansion boost."""
    r = normalize_tokens(required)
    v = normalize_tokens(volunteer)
    if not r:
        return 0.0
    if not v:
        return 0.0
    inter = r & v
    union = r | v
    jaccard = len(inter) / len(union) if union else 0.0
    coverage = len(inter) / len(r)  # how many required are covered
    base = 0.4 * jaccard + 0.6 * coverage

    # Semantic boost: check volunteer skills against Gemini-expanded semantic_skills
    semantic_boost = 0.0
    if semantic:
        s = normalize_tokens(semantic)
        sem_inter = (s - r) & v  # matches that came only from semantic expansion
        if sem_inter:
            semantic_boost = min(0.25, 0.08 * len(sem_inter))
    return round(min(1.0, base + semantic_boost), 4)


def availability_score(task: dict, volunteer: dict) -> float:
    dates = volunteer.get('availability_dates') or []
    slots = volunteer.get('availability_slots') or []
    if not dates:
        return 0.0
    start = task.get('start_date'); end = task.get('end_date')
    overlap = any(start <= d <= end for d in dates) if start and end else True
    if not overlap:
        return 0.0
    req_slots = task.get('required_slots') or ['morning', 'afternoon', 'evening']
    matching = len(set(slots) & set(req_slots))
    return round(min(1.0, matching / max(1, min(3, len(req_slots)))), 4)


async def impact_score(volunteer_id: str) -> float:
    completed = await db.matches.count_documents({"volunteer_id": volunteer_id, "status": "completed"})
    if completed == 0:
        return 0.0
    cursor = db.matches.find({"volunteer_id": volunteer_id, "status": "completed", "ngo_rating": {"$ne": None}}, {"_id": 0, "ngo_rating": 1})
    ratings = [doc["ngo_rating"] async for doc in cursor if doc.get("ngo_rating")]
    avg = sum(ratings) / len(ratings) if ratings else 3.0
    return round(min(1.0, (completed * avg) / 25.0), 4)


W_SKILL, W_PROX, W_AVAIL, W_IMPACT = 0.40, 0.30, 0.20, 0.10


async def compute_match_score(task: dict, volunteer: dict) -> dict:
    s_skill = skill_similarity(
        task.get('required_skills', []),
        volunteer.get('skills', []),
        semantic=task.get('semantic_skills', []),
    )
    dist = haversine_km(task.get('location_lat'), task.get('location_lng'),
                        volunteer.get('location_lat'), volunteer.get('location_lng'))
    s_prox = round(1.0 / (1.0 + dist / 10.0), 4)
    s_avail = availability_score(task, volunteer)
    s_impact = await impact_score(volunteer['user_id'])
    total = round(W_SKILL*s_skill + W_PROX*s_prox + W_AVAIL*s_avail + W_IMPACT*s_impact, 4)
    return {
        "volunteer_id": volunteer['user_id'],
        "volunteer_name": volunteer.get('name', ''),
        "score_total": total,
        "score_skill": s_skill,
        "score_proximity": s_prox,
        "score_availability": s_avail,
        "score_impact": s_impact,
        "distance_km": round(dist, 2),
    }


# ================== AUTH ==================

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


async def get_current_user(request: Request) -> Optional[dict]:
    """Get user from session_token cookie or Authorization header."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc():
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def require_user(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


async def require_role(request: Request, roles: List[str]) -> dict:
    user = await require_user(request)
    if user.get('role') not in roles:
        raise HTTPException(status_code=403, detail=f"Requires role: {roles}")
    return user


async def audit_log(action: str, actor: dict, target_id: str = "", target_collection: str = "", data: dict = None):
    doc = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "action": action,
        "performed_by": actor.get('user_id', 'system'),
        "performed_by_role": actor.get('role', 'system'),
        "performed_by_name": actor.get('name', 'System'),
        "target_id": target_id,
        "target_collection": target_collection,
        "data": data or {},
        "timestamp": now_utc().isoformat(),
    }
    await db.audit_logs.insert_one(doc)


# ================== AUTH ENDPOINTS ==================

class SessionRequest(BaseModel):
    session_id: str


@api.post("/auth/session")
async def create_session(payload: SessionRequest, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient(timeout=15.0) as http:
        r = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing.get("name")),
                      "picture": data.get("picture", existing.get("picture"))}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture"),
            "role": None,
            "verified": False,
            "skills": [], "languages": [], "availability_dates": [], "availability_slots": [],
            "total_points": 0, "badges": [],
            "created_at": now_utc().isoformat(),
        })

    # auto-grant admin to first user
    user_count = await db.users.count_documents({"role": "admin"})
    if user_count == 0:
        await db.users.update_one({"user_id": user_id}, {"$set": {"role": "admin", "verified": True}})

    session_token = data["session_token"]
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*3600,
        path="/",
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user}


@api.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or (request.headers.get("Authorization", "")[7:] if request.headers.get("Authorization", "").startswith("Bearer ") else None)
    if token:
        await db.user_sessions.delete_many({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


class OnboardRequest(BaseModel):
    role: str  # volunteer | ngo
    name: Optional[str] = None
    phone: Optional[str] = None
    # volunteer
    skills: List[str] = []
    languages: List[str] = []
    experience: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    availability_dates: List[str] = []
    availability_slots: List[str] = []
    # ngo
    ngo_name: Optional[str] = None
    registration_no: Optional[str] = None
    focus_areas: List[str] = []
    description: Optional[str] = None
    website: Optional[str] = None


@api.post("/auth/onboard")
async def onboard(body: OnboardRequest, request: Request):
    user = await require_user(request)
    if body.role not in ("volunteer", "ngo"):
        raise HTTPException(status_code=400, detail="Invalid role")
    update = {"role": body.role}
    if body.name: update["name"] = body.name
    if body.phone: update["phone"] = body.phone
    if body.role == "volunteer":
        update.update({
            "skills": body.skills, "languages": body.languages, "experience": body.experience,
            "location_lat": body.location_lat, "location_lng": body.location_lng,
            "location_name": body.location_name,
            "availability_dates": body.availability_dates, "availability_slots": body.availability_slots,
            "verified": True,
        })
    else:  # ngo
        ngo_id = f"ngo_{uuid.uuid4().hex[:10]}"
        ngo_doc = {
            "ngo_id": ngo_id,
            "name": body.ngo_name or body.name or user['name'],
            "registration_no": body.registration_no or "",
            "verified": False,
            "focus_areas": body.focus_areas,
            "description": body.description or "",
            "website": body.website,
            "contact_email": user['email'],
            "location_lat": body.location_lat or 11.25,
            "location_lng": body.location_lng or 75.78,
            "location_name": body.location_name or "Kerala, India",
            "admin_uid": user['user_id'],
            "rating": 0.0,
            "total_tasks_posted": 0,
            "created_at": now_utc().isoformat(),
        }
        await db.ngos.insert_one(ngo_doc)
        update["ngo_id"] = ngo_id
        update["registration_no"] = body.registration_no

    await db.users.update_one({"user_id": user['user_id']}, {"$set": update})
    await audit_log(f"onboard_{body.role}", user, user['user_id'], "users", {"role": body.role})
    return await db.users.find_one({"user_id": user['user_id']}, {"_id": 0})


# ================== USERS ==================

@api.get("/users/me")
async def users_me(request: Request):
    return await require_user(request)


@api.put("/users/me")
async def update_me(body: Dict[str, Any], request: Request):
    user = await require_user(request)
    allowed = {"name", "phone", "skills", "languages", "experience",
               "location_lat", "location_lng", "location_name",
               "availability_dates", "availability_slots", "picture"}
    update = {k: v for k, v in body.items() if k in allowed}
    if update:
        await db.users.update_one({"user_id": user['user_id']}, {"$set": update})
    return await db.users.find_one({"user_id": user['user_id']}, {"_id": 0})


@api.get("/users/{uid}")
async def get_user(uid: str, request: Request):
    await require_user(request)
    u = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return u


@api.put("/users/{uid}/verify")
async def verify_user(uid: str, request: Request):
    admin = await require_role(request, ["admin"])
    await db.users.update_one({"user_id": uid}, {"$set": {"verified": True}})
    await audit_log("verify_user", admin, uid, "users")
    return {"ok": True}


@api.delete("/users/{uid}")
async def delete_user(uid: str, request: Request):
    admin = await require_role(request, ["admin"])
    await db.users.delete_one({"user_id": uid})
    await audit_log("delete_user", admin, uid, "users")
    return {"ok": True}


# ================== NGOs ==================

@api.get("/ngos")
async def list_ngos(request: Request):
    await require_user(request)
    cursor = db.ngos.find({}, {"_id": 0})
    return [doc async for doc in cursor]


@api.get("/ngos/{ngo_id}")
async def get_ngo(ngo_id: str, request: Request):
    await require_user(request)
    n = await db.ngos.find_one({"ngo_id": ngo_id}, {"_id": 0})
    if not n:
        raise HTTPException(404, "NGO not found")
    return n


@api.put("/ngos/{ngo_id}/verify")
async def verify_ngo(ngo_id: str, request: Request):
    admin = await require_role(request, ["admin"])
    await db.ngos.update_one({"ngo_id": ngo_id}, {"$set": {"verified": True}})
    ngo = await db.ngos.find_one({"ngo_id": ngo_id}, {"_id": 0})
    if ngo:
        await db.users.update_one({"user_id": ngo["admin_uid"]}, {"$set": {"verified": True}})
    await audit_log("verify_ngo", admin, ngo_id, "ngos")
    return {"ok": True}


@api.delete("/ngos/{ngo_id}")
async def delete_ngo(ngo_id: str, request: Request):
    admin = await require_role(request, ["admin"])
    await db.ngos.delete_one({"ngo_id": ngo_id})
    await audit_log("delete_ngo", admin, ngo_id, "ngos")
    return {"ok": True}


# ================== TASKS ==================

class TaskCreate(BaseModel):
    title: str
    description: str
    category: str = "other"
    urgency: int = 3
    required_skills: List[str] = []
    required_slots: List[str] = []
    volunteers_required: int = 1
    location_lat: float
    location_lng: float
    location_name: str
    address: str = ""
    start_date: str
    end_date: str


async def gemini_translate(text: str) -> Dict[str, str]:
    """Translate via Gemini. Returns {lang_code: translated_text}."""
    out = {"en": text}
    if not EMERGENT_LLM_KEY or not text:
        return out
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"translate_{uuid.uuid4().hex[:8]}",
            system_message="You are a professional translator. Output ONLY the translated text with no explanation, no quotes, no labels."
        ).with_model("gemini", "gemini-2.5-flash")
        targets = {"hi": "Hindi", "ta": "Tamil", "ml": "Malayalam", "kn": "Kannada", "te": "Telugu"}
        for code, name in targets.items():
            try:
                msg = UserMessage(text=f"Translate this community-need text to {name} (native script). Keep it concise.\n\nTEXT: {text}")
                resp = await chat.send_message(msg)
                out[code] = (resp or "").strip().strip('"').strip("'")
            except Exception as e:
                logger.warning(f"translate {code} failed: {e}")
                out[code] = text
    except Exception as e:
        logger.warning(f"Gemini init failed: {e}")
    return out


async def gemini_expand_skills(required_skills: List[str], description: str = "") -> List[str]:
    """Use Gemini to expand required skills with semantic synonyms/related skills.
    Returns a list of lowercase expanded skill terms (excluding originals)."""
    if not EMERGENT_LLM_KEY or not required_skills:
        return []
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"expand_{uuid.uuid4().hex[:8]}",
            system_message=(
                "You are a skill taxonomy expert for a volunteer-matching platform. "
                "Given a list of required skills for a community task, output a comma-separated "
                "list of 8-12 closely related/synonym skills that a volunteer might list on their profile "
                "and still be a good match. Output ONLY the comma-separated list, lowercase, no numbering, no explanation."
            )
        ).with_model("gemini", "gemini-2.5-flash")
        prompt = f"REQUIRED SKILLS: {', '.join(required_skills)}"
        if description:
            prompt += f"\nTASK CONTEXT: {description[:300]}"
        prompt += "\n\nOutput related skill terms now:"
        resp = await chat.send_message(UserMessage(text=prompt))
        raw = (resp or "").strip()
        items = [s.strip().lower() for s in raw.replace("\n", ",").split(",") if s.strip()]
        # exclude exact originals
        originals = {s.lower() for s in required_skills}
        expanded = [s for s in items if s not in originals and len(s) > 1 and len(s) < 40]
        return expanded[:15]
    except Exception as e:
        logger.warning(f"Gemini skill expansion failed: {e}")
        return []


async def create_notification(user_id: str, kind: str, title: str, body: str, link: str = "", meta: dict = None):
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "link": link,
        "meta": meta or {},
        "read": False,
        "created_at": now_utc().isoformat(),
    })


@api.post("/tasks")
async def create_task(body: TaskCreate, request: Request):
    user = await require_role(request, ["ngo", "admin"])
    if user.get('role') == 'ngo' and not user.get('ngo_id'):
        raise HTTPException(400, "Complete NGO onboarding first")

    ngo_id = user.get('ngo_id')
    ngo = await db.ngos.find_one({"ngo_id": ngo_id}, {"_id": 0}) if ngo_id else None
    ngo_name = ngo['name'] if ngo else 'System'

    task_id = f"task_{uuid.uuid4().hex[:10]}"
    # urgency score: urgency * recency factor (new = 1)
    urgency_score = round(body.urgency * 1.0, 2)

    # Run Gemini translation + skill expansion in parallel (bounded)
    translations = {"en": body.description}
    semantic_skills: List[str] = []
    try:
        t_res, s_res = await asyncio.wait_for(
            asyncio.gather(
                gemini_translate(body.description),
                gemini_expand_skills(body.required_skills, body.description),
                return_exceptions=True,
            ),
            timeout=30.0,
        )
        if not isinstance(t_res, Exception) and t_res:
            translations = t_res
        if not isinstance(s_res, Exception) and s_res:
            semantic_skills = s_res
    except asyncio.TimeoutError:
        logger.warning("Gemini translation/expansion timed out")

    doc = {
        "task_id": task_id,
        "ngo_id": ngo_id or "admin",
        "ngo_name": ngo_name,
        "title": body.title,
        "description": body.description,
        "description_translated": translations,
        "urgency": body.urgency,
        "urgency_score": urgency_score,
        "category": body.category,
        "required_skills": body.required_skills,
        "semantic_skills": semantic_skills,
        "required_slots": body.required_slots or ["morning", "afternoon", "evening"],
        "location_lat": body.location_lat,
        "location_lng": body.location_lng,
        "location_name": body.location_name,
        "address": body.address,
        "volunteers_required": body.volunteers_required,
        "volunteers_matched": 0,
        "start_date": body.start_date,
        "end_date": body.end_date,
        "status": "open",
        "applicants": [],
        "created_at": now_utc().isoformat(),
    }
    await db.tasks.insert_one(doc)
    if ngo_id:
        await db.ngos.update_one({"ngo_id": ngo_id}, {"$inc": {"total_tasks_posted": 1}})
    await audit_log("create_task", user, task_id, "tasks", {"title": body.title, "urgency": body.urgency})
    return {"task_id": task_id, "task": {k: v for k, v in doc.items() if k != "_id"}}


@api.get("/tasks")
async def list_tasks(request: Request, status: Optional[str] = None, category: Optional[str] = None,
                     ngo_id: Optional[str] = None, urgency_min: Optional[int] = None):
    await require_user(request)
    q: Dict[str, Any] = {}
    if status: q["status"] = status
    if category: q["category"] = category
    if ngo_id: q["ngo_id"] = ngo_id
    if urgency_min is not None: q["urgency"] = {"$gte": urgency_min}
    cursor = db.tasks.find(q, {"_id": 0}).sort("urgency_score", -1).limit(200)
    return [doc async for doc in cursor]


@api.get("/tasks/{task_id}")
async def get_task(task_id: str, request: Request):
    await require_user(request)
    t = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@api.put("/tasks/{task_id}")
async def update_task(task_id: str, body: Dict[str, Any], request: Request):
    user = await require_role(request, ["ngo", "admin"])
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(404, "Task not found")
    if user['role'] == 'ngo' and task['ngo_id'] != user.get('ngo_id'):
        raise HTTPException(403, "Not your task")
    allowed = {"title", "description", "urgency", "category", "required_skills",
               "volunteers_required", "start_date", "end_date", "status", "address"}
    update = {k: v for k, v in body.items() if k in allowed}
    if update:
        await db.tasks.update_one({"task_id": task_id}, {"$set": update})
    await audit_log("update_task", user, task_id, "tasks", update)
    return await db.tasks.find_one({"task_id": task_id}, {"_id": 0})


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    admin = await require_role(request, ["admin"])
    await db.tasks.delete_one({"task_id": task_id})
    await db.matches.delete_many({"task_id": task_id})
    await audit_log("delete_task", admin, task_id, "tasks")
    return {"ok": True}


@api.post("/tasks/{task_id}/apply")
async def apply_task(task_id: str, request: Request):
    user = await require_role(request, ["volunteer"])
    await db.tasks.update_one({"task_id": task_id}, {"$addToSet": {"applicants": user['user_id']}})
    await audit_log("apply_task", user, task_id, "tasks")
    return {"ok": True}


# ================== MATCHING ==================

@api.post("/match/run/{task_id}")
async def run_matching(task_id: str, request: Request):
    actor = await require_role(request, ["admin", "ngo"])
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(404, "Task not found")
    # NGO can only run matching on their own tasks
    if actor.get('role') == 'ngo' and task.get('ngo_id') != actor.get('ngo_id'):
        raise HTTPException(403, "You can only run matching on your own tasks")

    cursor = db.users.find({"role": "volunteer", "verified": True}, {"_id": 0})
    volunteers = [v async for v in cursor]
    if not volunteers:
        return {"task_id": task_id, "matches": [], "message": "No volunteers available"}

    scores = []
    for v in volunteers:
        s = await compute_match_score(task, v)
        scores.append(s)
    scores.sort(key=lambda x: (-x['score_total'], -x['score_skill'], x['distance_km']))
    top_n = scores[: max(task['volunteers_required'], min(5, len(scores)))]

    # clear previous pending matches for this task
    await db.matches.delete_many({"task_id": task_id, "status": "pending"})
    for s in top_n:
        match_doc = {
            "match_id": f"match_{uuid.uuid4().hex[:10]}",
            "task_id": task_id,
            "task_title": task['title'],
            "volunteer_id": s['volunteer_id'],
            "volunteer_name": s['volunteer_name'],
            "ngo_id": task['ngo_id'],
            "score_total": s['score_total'],
            "score_skill": s['score_skill'],
            "score_proximity": s['score_proximity'],
            "score_availability": s['score_availability'],
            "score_impact": s['score_impact'],
            "distance_km": s['distance_km'],
            "status": "pending",
            "matched_by": actor['user_id'],
            "created_at": now_utc().isoformat(),
        }
        await db.matches.insert_one(match_doc)
        # In-app notification for matched volunteer
        await create_notification(
            user_id=s['volunteer_id'],
            kind="match_created",
            title="New task match",
            body=f"You have been matched to \"{task['title']}\" by {task.get('ngo_name', 'an NGO')}",
            link="/volunteer/matches",
            meta={"match_id": match_doc["match_id"], "task_id": task_id, "score": s['score_total']},
        )

    await db.tasks.update_one({"task_id": task_id}, {"$set": {"status": "matching"}})
    await audit_log("run_matching", actor, task_id, "tasks", {"candidates": len(top_n)})
    out = await db.matches.find({"task_id": task_id}, {"_id": 0}).sort("score_total", -1).to_list(100)
    return {"task_id": task_id, "matches": out, "all_scored": scores}


@api.get("/match/results/{task_id}")
async def match_results(task_id: str, request: Request):
    await require_user(request)
    matches = await db.matches.find({"task_id": task_id}, {"_id": 0}).sort("score_total", -1).to_list(100)
    return matches


@api.get("/match/my-matches")
async def my_matches(request: Request):
    user = await require_role(request, ["volunteer"])
    matches = await db.matches.find({"volunteer_id": user['user_id']}, {"_id": 0}).sort("created_at", -1).to_list(100)
    # enrich with task info
    for m in matches:
        t = await db.tasks.find_one({"task_id": m['task_id']}, {"_id": 0})
        m['task'] = t
    return matches


@api.get("/match/task/{task_id}")
async def task_matches(task_id: str, request: Request):
    await require_user(request)
    return await db.matches.find({"task_id": task_id}, {"_id": 0}).sort("score_total", -1).to_list(100)


class MatchResponse(BaseModel):
    status: str  # accepted | declined
    reason: Optional[str] = None


@api.put("/match/{match_id}/respond")
async def respond_match(match_id: str, body: MatchResponse, request: Request):
    user = await require_role(request, ["volunteer"])
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match or match['volunteer_id'] != user['user_id']:
        raise HTTPException(403, "Not your match")
    await db.matches.update_one({"match_id": match_id}, {"$set": {
        "status": body.status,
        "volunteer_response": body.reason,
    }})
    if body.status == "accepted":
        await db.tasks.update_one({"task_id": match['task_id']}, {"$inc": {"volunteers_matched": 1}, "$set": {"status": "active"}})
    # Notify NGO admin
    ngo = await db.ngos.find_one({"ngo_id": match.get('ngo_id')}, {"_id": 0})
    if ngo and ngo.get("admin_uid"):
        verb = "accepted" if body.status == "accepted" else "declined"
        await create_notification(
            user_id=ngo["admin_uid"],
            kind=f"match_{body.status}",
            title=f"Volunteer {verb}",
            body=f"{user['name']} {verb} \"{match.get('task_title', 'your task')}\"",
            link=f"/ngo/tasks/{match['task_id']}",
            meta={"match_id": match_id, "task_id": match['task_id']},
        )
    await audit_log(f"match_{body.status}", user, match_id, "matches")
    return {"ok": True}


@api.put("/match/{match_id}/complete")
async def complete_match(match_id: str, request: Request):
    user = await require_role(request, ["ngo", "admin"])
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(404, "Match not found")
    task = await db.tasks.find_one({"task_id": match['task_id']}, {"_id": 0})
    await db.matches.update_one({"match_id": match_id}, {"$set": {
        "status": "completed",
        "completed_at": now_utc().isoformat(),
    }})

    # award points
    points_map = {1: 50, 2: 100, 3: 150, 4: 200, 5: 300}
    points = points_map.get(task['urgency'] if task else 3, 100)

    completed_count = await db.matches.count_documents({"volunteer_id": match['volunteer_id'], "status": "completed"})
    milestone_bonus = 100 if completed_count == 1 else 0

    reward_doc = {
        "reward_id": f"rwd_{uuid.uuid4().hex[:10]}",
        "volunteer_id": match['volunteer_id'],
        "type": "task_complete",
        "points": points + milestone_bonus,
        "description": f"Completed: {task['title'] if task else ''}",
        "task_id": match['task_id'],
        "created_at": now_utc().isoformat(),
    }
    await db.rewards.insert_one(reward_doc)
    await db.users.update_one({"user_id": match['volunteer_id']}, {"$inc": {"total_points": points + milestone_bonus}})

    # badges
    vol = await db.users.find_one({"user_id": match['volunteer_id']}, {"_id": 0})
    badges = set(vol.get('badges', []))
    if completed_count >= 1: badges.add("first_responder")
    if vol.get('total_points', 0) >= 1000: badges.add("community_hero")
    if completed_count >= 5: badges.add("skill_champion")
    await db.users.update_one({"user_id": match['volunteer_id']}, {"$set": {"badges": list(badges)}})

    await audit_log("complete_match", user, match_id, "matches", {"points": points + milestone_bonus})
    # Notify volunteer about points & completion
    await create_notification(
        user_id=match['volunteer_id'],
        kind="task_completed",
        title=f"+{points + milestone_bonus} points earned!",
        body=f"Task \"{task['title'] if task else ''}\" marked complete. Tap to view rewards.",
        link="/volunteer/rewards",
        meta={"match_id": match_id, "points": points + milestone_bonus},
    )
    return {"ok": True, "points_awarded": points + milestone_bonus}


class RatingRequest(BaseModel):
    rating: int


@api.put("/match/{match_id}/rate")
async def rate_match(match_id: str, body: RatingRequest, request: Request):
    user = await require_user(request)
    match = await db.matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(404, "Not found")
    field = "ngo_rating" if user['role'] in ("ngo", "admin") else "volunteer_rating"
    await db.matches.update_one({"match_id": match_id}, {"$set": {field: body.rating}})
    if field == "ngo_rating" and body.rating == 5:
        # bonus
        await db.users.update_one({"user_id": match['volunteer_id']}, {"$inc": {"total_points": 50}})
        await db.rewards.insert_one({
            "reward_id": f"rwd_{uuid.uuid4().hex[:10]}",
            "volunteer_id": match['volunteer_id'],
            "type": "badge",
            "points": 50,
            "description": "5-star rating bonus",
            "task_id": match['task_id'],
            "created_at": now_utc().isoformat(),
        })
    return {"ok": True}


# ================== REWARDS ==================

@api.get("/rewards/my-points")
async def my_points(request: Request):
    user = await require_role(request, ["volunteer"])
    return {"total_points": user.get('total_points', 0), "badges": user.get('badges', [])}


@api.get("/rewards/catalog")
async def rewards_catalog(request: Request):
    await require_user(request)
    cursor = db.rewards_catalog.find({"active": True}, {"_id": 0})
    return [d async for d in cursor]


@api.get("/rewards/leaderboard")
async def leaderboard(request: Request):
    await require_user(request)
    cursor = db.users.find({"role": "volunteer"}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "total_points": 1, "badges": 1}).sort("total_points", -1).limit(20)
    return [d async for d in cursor]


@api.get("/rewards/history")
async def rewards_history(request: Request):
    user = await require_role(request, ["volunteer"])
    cursor = db.rewards.find({"volunteer_id": user['user_id']}, {"_id": 0}).sort("created_at", -1).limit(100)
    return [d async for d in cursor]


class RedeemRequest(BaseModel):
    catalog_id: str


@api.post("/rewards/redeem")
async def redeem(body: RedeemRequest, request: Request):
    user = await require_role(request, ["volunteer"])
    item = await db.rewards_catalog.find_one({"catalog_id": body.catalog_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Reward not found")
    if user['total_points'] < item['points_cost']:
        raise HTTPException(400, "Insufficient points")
    if item.get('stock', 0) <= 0:
        raise HTTPException(400, "Out of stock")
    await db.users.update_one({"user_id": user['user_id']}, {"$inc": {"total_points": -item['points_cost']}})
    await db.rewards_catalog.update_one({"catalog_id": body.catalog_id}, {"$inc": {"stock": -1}})
    redemption = {
        "reward_id": f"rwd_{uuid.uuid4().hex[:10]}",
        "volunteer_id": user['user_id'],
        "volunteer_name": user['name'],
        "type": "redemption",
        "points": -item['points_cost'],
        "description": f"Redeemed: {item['title']}",
        "catalog_id": body.catalog_id,
        "catalog_title": item['title'],
        "fulfilled": False,
        "created_at": now_utc().isoformat(),
    }
    await db.rewards.insert_one(redemption)
    await audit_log("redeem_reward", user, body.catalog_id, "rewards_catalog", {"title": item['title']})
    return redemption


# ================== ADMIN ==================

@api.get("/admin/stats")
async def admin_stats(request: Request):
    await require_role(request, ["admin"])
    ngos_total = await db.ngos.count_documents({})
    ngos_verified = await db.ngos.count_documents({"verified": True})
    volunteers = await db.users.count_documents({"role": "volunteer"})
    tasks_open = await db.tasks.count_documents({"status": "open"})
    tasks_total = await db.tasks.count_documents({})
    matches_week = await db.matches.count_documents({"created_at": {"$gte": (now_utc() - timedelta(days=7)).isoformat()}})
    matches_total = await db.matches.count_documents({})
    return {
        "ngos_total": ngos_total, "ngos_verified": ngos_verified,
        "volunteers": volunteers,
        "tasks_open": tasks_open, "tasks_total": tasks_total,
        "matches_week": matches_week, "matches_total": matches_total,
    }


@api.get("/admin/audit-logs")
async def get_audit(request: Request, limit: int = Query(50, le=200)):
    await require_role(request, ["admin"])
    cursor = db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    return [d async for d in cursor]


@api.get("/admin/unverified")
async def unverified(request: Request):
    await require_role(request, ["admin"])
    ngos = await db.ngos.find({"verified": False}, {"_id": 0}).to_list(100)
    users = await db.users.find({"role": "volunteer", "verified": False}, {"_id": 0}).to_list(100)
    return {"ngos": ngos, "volunteers": users}


@api.get("/admin/users")
async def list_all_users(request: Request, role: Optional[str] = None):
    await require_role(request, ["admin"])
    q = {"role": role} if role else {}
    cursor = db.users.find(q, {"_id": 0}).sort("created_at", -1).limit(500)
    return [d async for d in cursor]


# ================== DEMO SEED ==================

KERALA_LOCATIONS = [
    ("Kozhikode", 11.2588, 75.7804),
    ("Malappuram", 11.0510, 76.0711),
    ("Wayanad", 11.6854, 76.1320),
    ("Kannur", 11.8745, 75.3704),
    ("Palakkad", 10.7867, 76.6548),
    ("Thrissur", 10.5276, 76.2144),
    ("Kochi", 9.9312, 76.2673),
    ("Alappuzha", 9.4981, 76.3388),
    ("Kollam", 8.8932, 76.6141),
    ("Thiruvananthapuram", 8.5241, 76.9366),
]

SKILLS_POOL = [
    ["first aid", "emergency response", "cpr"],
    ["teaching", "english", "mathematics", "tutoring"],
    ["construction", "plumbing", "carpentry"],
    ["data entry", "excel", "documentation"],
    ["malayalam translation", "content writing", "hindi"],
    ["nursing", "healthcare", "patient care"],
    ["software", "python", "web development"],
    ["counselling", "mental health", "social work"],
    ["cooking", "food distribution", "logistics"],
    ["driving", "transport", "delivery"],
    ["photography", "social media"],
    ["agriculture", "farming", "organic"],
    ["legal aid", "documentation", "consulting"],
    ["teaching", "science", "physics"],
    ["tailoring", "skill training", "sewing"],
]

FIRST_NAMES = ["Aarav", "Arya", "Meera", "Ravi", "Sita", "Kiran", "Anjali", "Vishnu", "Lakshmi", "Rahul", "Priya", "Arun", "Divya", "Suresh", "Nandini"]
LAST_NAMES = ["Nair", "Menon", "Pillai", "Kurup", "Iyer", "Krishnan", "Thomas", "Varghese", "Mathew", "Das"]

TASKS_SEED = [
    {"title": "Flood Relief Medical Camp", "description": "Urgent medical camp needed in flood-affected Wayanad area. Need nurses and first-aid trained volunteers to distribute medicines and provide basic healthcare.", "category": "healthcare", "urgency": 5, "required_skills": ["first aid", "nursing", "healthcare"], "volunteers_required": 8, "status": "open"},
    {"title": "Tuition for Tribal Children", "description": "Weekend tutoring for 30 tribal children in Wayanad. Subjects: Mathematics, English. Looking for patient teachers.", "category": "education", "urgency": 3, "required_skills": ["teaching", "mathematics", "english"], "volunteers_required": 5, "status": "open"},
    {"title": "Post-Flood Home Reconstruction", "description": "Help rebuild homes damaged in recent floods in Malappuram. Need carpenters, construction volunteers, and logistics coordinators.", "category": "disaster", "urgency": 4, "required_skills": ["construction", "carpentry", "plumbing"], "volunteers_required": 12, "status": "open"},
    {"title": "Mental Health Awareness Drive", "description": "Community workshop on mental health in Kochi urban wards. Need counsellors and social workers.", "category": "healthcare", "urgency": 2, "required_skills": ["counselling", "mental health", "social work"], "volunteers_required": 4, "status": "open"},
    {"title": "Digital Literacy for Seniors", "description": "Teaching smartphone and digital payment basics to senior citizens in Thrissur. Patient volunteers needed.", "category": "education", "urgency": 2, "required_skills": ["teaching", "software", "malayalam translation"], "volunteers_required": 6, "status": "matching"},
    {"title": "Organic Farming Training Camp", "description": "Sustainable agriculture training for small farmers in Palakkad. Need agriculture experts and translators.", "category": "environment", "urgency": 3, "required_skills": ["agriculture", "farming", "teaching"], "volunteers_required": 3, "status": "matching"},
    {"title": "Emergency Blood Donation Drive", "description": "Critical shortage of O-negative blood in Kozhikode hospital. Organisers and medical volunteers needed.", "category": "healthcare", "urgency": 5, "required_skills": ["healthcare", "logistics", "social media"], "volunteers_required": 10, "status": "open"},
    {"title": "Food Distribution Program", "description": "Daily food packets for migrant workers in Kochi. Need cooks and delivery volunteers.", "category": "disaster", "urgency": 4, "required_skills": ["cooking", "food distribution", "driving"], "volunteers_required": 15, "status": "active"},
    {"title": "Tailoring Skill Program for Women", "description": "3-month tailoring training for women self-help groups in Kannur. Trainers required.", "category": "education", "urgency": 2, "required_skills": ["tailoring", "skill training", "teaching"], "volunteers_required": 2, "status": "active"},
    {"title": "Beach Clean-Up Drive", "description": "Community beach clean-up in Alappuzha. All volunteers welcome.", "category": "environment", "urgency": 1, "required_skills": ["environment", "logistics"], "volunteers_required": 20, "status": "completed"},
]

CATALOG_SEED = [
    {"catalog_id": "cat_amzn500", "title": "Amazon Gift Card Rs.500", "points_cost": 500, "stock": 10, "image_url": "", "active": True},
    {"catalog_id": "cat_amzn1000", "title": "Amazon Gift Card Rs.1000", "points_cost": 1000, "stock": 5, "image_url": "", "active": True},
    {"catalog_id": "cat_tshirt", "title": "SRA Volunteer T-Shirt", "points_cost": 300, "stock": 25, "image_url": "", "active": True},
    {"catalog_id": "cat_kit", "title": "First-Aid Kit", "points_cost": 400, "stock": 15, "image_url": "", "active": True},
    {"catalog_id": "cat_cert", "title": "Certificate of Impact (Printed)", "points_cost": 200, "stock": 100, "image_url": "", "active": True},
    {"catalog_id": "cat_premium", "title": "Premium Volunteer Badge", "points_cost": 2000, "stock": 3, "image_url": "", "active": True},
]


@api.post("/admin/seed-demo")
async def seed_demo(request: Request):
    admin = await require_role(request, ["admin"])
    # wipe only previously-seeded demo data (scoped by @demo.sra email domain)
    demo_ngo_user_ids = [u["user_id"] async for u in db.users.find({"email": {"$regex": "@demo.sra$"}, "role": "ngo"}, {"_id": 0, "user_id": 1})]
    demo_vol_user_ids = [u["user_id"] async for u in db.users.find({"email": {"$regex": "@demo.sra$"}, "role": "volunteer"}, {"_id": 0, "user_id": 1})]
    demo_user_ids = demo_ngo_user_ids + demo_vol_user_ids
    demo_ngo_ids = [n["ngo_id"] async for n in db.ngos.find({"admin_uid": {"$in": demo_ngo_user_ids}} if demo_ngo_user_ids else {"ngo_id": "__none__"}, {"_id": 0, "ngo_id": 1})]

    await db.users.delete_many({"email": {"$regex": "@demo.sra$"}})
    if demo_ngo_ids:
        await db.tasks.delete_many({"ngo_id": {"$in": demo_ngo_ids}})
        await db.matches.delete_many({"ngo_id": {"$in": demo_ngo_ids}})
        await db.ngos.delete_many({"ngo_id": {"$in": demo_ngo_ids}})
    if demo_user_ids:
        await db.rewards.delete_many({"volunteer_id": {"$in": demo_user_ids}})
        await db.matches.delete_many({"volunteer_id": {"$in": demo_user_ids}})

    # seed catalog only if empty (don't wipe existing catalog)
    if await db.rewards_catalog.count_documents({}) == 0:
        for item in CATALOG_SEED:
            await db.rewards_catalog.insert_one({**item, "created_at": now_utc().isoformat()})

    # seed 3 NGOs
    ngos_info = [
        ("Hope Wayanad Foundation", "education", "Education for tribal and marginalised children", 2, KERALA_LOCATIONS[2]),
        ("Kozhikode Health Relief", "healthcare", "Community healthcare and emergency response", 0, KERALA_LOCATIONS[0]),
        ("Malappuram Disaster Response", "disaster relief", "Rapid response to floods and natural disasters", 1, KERALA_LOCATIONS[1]),
    ]
    ngo_docs = []
    for name, focus, desc, loc_idx, loc in ngos_info:
        ngo_admin_uid = f"user_{uuid.uuid4().hex[:12]}"
        ngo_id = f"ngo_{uuid.uuid4().hex[:10]}"
        await db.users.insert_one({
            "user_id": ngo_admin_uid,
            "email": f"{name.lower().replace(' ', '')}@demo.sra",
            "name": f"{name} Admin",
            "role": "ngo",
            "verified": True,
            "ngo_id": ngo_id,
            "total_points": 0, "badges": [], "skills": [], "languages": [],
            "availability_dates": [], "availability_slots": [],
            "created_at": now_utc().isoformat(),
        })
        ngo_doc = {
            "ngo_id": ngo_id, "name": name, "registration_no": f"REG/KL/{random.randint(1000,9999)}",
            "verified": True, "focus_areas": [focus], "description": desc,
            "website": f"https://{name.lower().replace(' ', '')}.org", "contact_email": f"{name.lower().replace(' ', '')}@demo.sra",
            "location_lat": loc[1], "location_lng": loc[2], "location_name": loc[0],
            "admin_uid": ngo_admin_uid, "rating": round(random.uniform(3.5, 5.0), 1),
            "total_tasks_posted": 0, "created_at": now_utc().isoformat(),
        }
        await db.ngos.insert_one(ngo_doc)
        ngo_docs.append(ngo_doc)

    # seed 15 volunteers
    volunteer_docs = []
    for i in range(15):
        uid = f"user_{uuid.uuid4().hex[:12]}"
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        loc = random.choice(KERALA_LOCATIONS)
        skills = random.choice(SKILLS_POOL)
        langs = random.sample(["Malayalam", "English", "Hindi", "Tamil"], k=random.randint(2, 3))
        dates = [(now_utc() + timedelta(days=d)).strftime("%Y-%m-%d") for d in range(0, 30, 2)]
        slots = random.sample(["morning", "afternoon", "evening"], k=random.randint(1, 3))
        points = random.choice([0, 0, 100, 250, 450, 700, 1100])
        badges = []
        if points > 0: badges.append("first_responder")
        if points >= 1000: badges.append("community_hero")
        doc = {
            "user_id": uid,
            "email": f"volunteer{i}@demo.sra",
            "name": name,
            "role": "volunteer",
            "verified": True,
            "phone": f"+91 9{random.randint(100000000, 999999999)}",
            "skills": skills,
            "languages": langs,
            "experience": random.choice(["1 year", "2-3 years", "5+ years", "Fresh volunteer"]),
            "location_lat": loc[1] + random.uniform(-0.1, 0.1),
            "location_lng": loc[2] + random.uniform(-0.1, 0.1),
            "location_name": loc[0],
            "availability_dates": dates,
            "availability_slots": slots,
            "total_points": points,
            "badges": badges,
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(doc)
        volunteer_docs.append(doc)

    # seed 10 tasks across 3 NGOs
    for i, t in enumerate(TASKS_SEED):
        ngo = ngo_docs[i % len(ngo_docs)]
        task_id = f"task_{uuid.uuid4().hex[:10]}"
        start = (now_utc() + timedelta(days=random.randint(1, 5))).strftime("%Y-%m-%d")
        end = (now_utc() + timedelta(days=random.randint(10, 25))).strftime("%Y-%m-%d")
        doc = {
            "task_id": task_id,
            "ngo_id": ngo["ngo_id"],
            "ngo_name": ngo["name"],
            "title": t["title"],
            "description": t["description"],
            "description_translated": {"en": t["description"]},
            "urgency": t["urgency"],
            "urgency_score": float(t["urgency"]),
            "category": t["category"],
            "required_skills": t["required_skills"],
            "required_slots": ["morning", "afternoon"],
            "location_lat": ngo["location_lat"] + random.uniform(-0.2, 0.2),
            "location_lng": ngo["location_lng"] + random.uniform(-0.2, 0.2),
            "location_name": ngo["location_name"],
            "address": f"{ngo['location_name']}, Kerala",
            "volunteers_required": t["volunteers_required"],
            "volunteers_matched": random.randint(0, min(3, t["volunteers_required"])) if t["status"] != "open" else 0,
            "start_date": start,
            "end_date": end,
            "status": t["status"],
            "applicants": [],
            "created_at": now_utc().isoformat(),
        }
        await db.tasks.insert_one(doc)
        await db.ngos.update_one({"ngo_id": ngo["ngo_id"]}, {"$inc": {"total_tasks_posted": 1}})

    await audit_log("seed_demo", admin, "system", "bulk", {"volunteers": 15, "ngos": 3, "tasks": 10})
    return {"ok": True, "ngos": 3, "volunteers": 15, "tasks": 10, "catalog": len(CATALOG_SEED)}


# ================== NOTIFICATIONS ==================

@api.get("/notifications")
async def list_notifications(request: Request, limit: int = Query(30, le=100)):
    user = await require_user(request)
    cursor = db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = [d async for d in cursor]
    unread = sum(1 for n in items if not n.get("read"))
    return {"items": items, "unread": unread}


@api.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, request: Request):
    user = await require_user(request)
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"read": True}},
    )
    return {"ok": True}


@api.put("/notifications/read-all")
async def mark_all_read(request: Request):
    user = await require_user(request)
    await db.notifications.update_many({"user_id": user["user_id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


# ================== PUBLIC IMPACT ==================

_impact_cache = {"data": None, "ts": 0}
_IMPACT_TTL = 45  # seconds

import time as _time


@api.get("/impact/public")
async def public_impact():
    """Public (unauthenticated) impact dashboard stats + recent completed tasks.
    Cached for 45s to protect the unauth endpoint. Lat/lng rounded to ~1km for privacy."""
    now = _time.time()
    if _impact_cache["data"] and (now - _impact_cache["ts"] < _IMPACT_TTL):
        return _impact_cache["data"]

    ngos_total = await db.ngos.count_documents({"verified": True})
    volunteers = await db.users.count_documents({"role": "volunteer"})
    tasks_total = await db.tasks.count_documents({})
    tasks_completed = await db.tasks.count_documents({"status": "completed"})
    tasks_active = await db.tasks.count_documents({"status": {"$in": ["active", "matching"]}})
    matches_total = await db.matches.count_documents({})
    matches_completed = await db.matches.count_documents({"status": "completed"})
    total_points_agg = await db.users.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$total_points"}}}
    ]).to_list(1)
    total_points = total_points_agg[0]["total"] if total_points_agg else 0

    leaders = await db.users.find(
        {"role": "volunteer"},
        {"_id": 0, "name": 1, "total_points": 1, "badges": 1, "location_name": 1}
    ).sort("total_points", -1).limit(5).to_list(5)

    recent_completed = await db.tasks.find(
        {"status": "completed"},
        {"_id": 0, "title": 1, "category": 1, "urgency": 1, "location_name": 1, "ngo_name": 1, "volunteers_required": 1, "volunteers_matched": 1}
    ).sort("created_at", -1).limit(8).to_list(8)

    heat_raw = await db.tasks.find(
        {"status": {"$in": ["open", "matching", "active"]}},
        {"_id": 0, "location_lat": 1, "location_lng": 1, "urgency": 1, "category": 1, "title": 1, "location_name": 1}
    ).limit(200).to_list(200)
    # Round lat/lng to 2 decimal places (~1km grid) for privacy on public endpoint
    heat = [
        {
            "location_lat": round(h.get("location_lat", 0), 2) if h.get("location_lat") else None,
            "location_lng": round(h.get("location_lng", 0), 2) if h.get("location_lng") else None,
            "urgency": h.get("urgency"),
            "category": h.get("category"),
            "title": h.get("title"),
            "location_name": h.get("location_name"),
        }
        for h in heat_raw
    ]

    categories_cursor = db.tasks.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ])
    categories = [{"category": c["_id"], "count": c["count"]} async for c in categories_cursor]

    payload = {
        "stats": {
            "ngos": ngos_total,
            "volunteers": volunteers,
            "tasks_total": tasks_total,
            "tasks_completed": tasks_completed,
            "tasks_active": tasks_active,
            "matches_total": matches_total,
            "matches_completed": matches_completed,
            "total_points_awarded": total_points,
        },
        "leaders": leaders,
        "recent_completed": recent_completed,
        "heatmap": heat,
        "categories": categories,
    }
    _impact_cache["data"] = payload
    _impact_cache["ts"] = now
    return payload


# ================== HEALTH ==================

@api.get("/")
async def health():
    return {"status": "ok", "service": "Smart Resource Allocation API"}


# ================== APP ==================

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Ensure indexes
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email")
    await db.ngos.create_index("ngo_id", unique=True)
    await db.tasks.create_index("task_id", unique=True)
    await db.tasks.create_index([("status", 1), ("urgency_score", -1)])
    await db.matches.create_index("match_id", unique=True)
    await db.matches.create_index([("volunteer_id", 1), ("status", 1)])
    await db.user_sessions.create_index("session_token")
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    # Seed catalog if empty
    if await db.rewards_catalog.count_documents({}) == 0:
        for item in CATALOG_SEED:
            await db.rewards_catalog.insert_one({**item, "created_at": now_utc().isoformat()})
    logger.info("SRA API ready")


@app.on_event("shutdown")
async def shutdown():
    client.close()
