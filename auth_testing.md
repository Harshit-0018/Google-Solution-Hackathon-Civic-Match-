# Smart Resource Allocation — Auth Testing Playbook

The app uses Emergent-managed Google OAuth. To test auth-gated pages without going through the real Google flow, directly insert a session into MongoDB.

## 1. Create test users & sessions

```bash
mongosh --eval "
use('test_database');

// Admin user
var adminId = 'user_admin_test';
var adminToken = 'test_admin_session_' + Date.now();
db.users.updateOne(
  { user_id: adminId },
  { \$set: {
    user_id: adminId,
    email: 'admin.test@sra.local',
    name: 'Admin Test',
    role: 'admin',
    verified: true,
    total_points: 0, badges: [], skills: [], languages: [],
    availability_dates: [], availability_slots: [],
    created_at: new Date().toISOString()
  }},
  { upsert: true }
);
db.user_sessions.insertOne({
  user_id: adminId,
  session_token: adminToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('ADMIN_TOKEN=' + adminToken);

// Volunteer user
var volId = 'user_vol_test';
var volToken = 'test_vol_session_' + Date.now();
db.users.updateOne(
  { user_id: volId },
  { \$set: {
    user_id: volId,
    email: 'vol.test@sra.local',
    name: 'Volunteer Test',
    role: 'volunteer',
    verified: true,
    skills: ['first aid', 'teaching', 'malayalam translation'],
    languages: ['Malayalam', 'English'],
    location_lat: 11.2588, location_lng: 75.7804,
    location_name: 'Kozhikode',
    availability_dates: ['2026-04-24', '2026-04-26', '2026-04-28'],
    availability_slots: ['morning', 'afternoon'],
    total_points: 0, badges: [],
    created_at: new Date().toISOString()
  }},
  { upsert: true }
);
db.user_sessions.insertOne({
  user_id: volId,
  session_token: volToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('VOLUNTEER_TOKEN=' + volToken);

// NGO user
var ngoAdminId = 'user_ngo_test';
var ngoToken = 'test_ngo_session_' + Date.now();
var ngoId = 'ngo_test_123';
db.users.updateOne(
  { user_id: ngoAdminId },
  { \$set: {
    user_id: ngoAdminId,
    email: 'ngo.test@sra.local',
    name: 'NGO Admin Test',
    role: 'ngo',
    verified: true,
    ngo_id: ngoId,
    skills: [], languages: [], availability_dates: [], availability_slots: [],
    total_points: 0, badges: [],
    created_at: new Date().toISOString()
  }},
  { upsert: true }
);
db.ngos.updateOne(
  { ngo_id: ngoId },
  { \$set: {
    ngo_id: ngoId, name: 'Test NGO', registration_no: 'REG/KL/9999',
    verified: true, focus_areas: ['healthcare'], description: 'Test NGO',
    contact_email: 'ngo.test@sra.local',
    location_lat: 11.0, location_lng: 76.0, location_name: 'Kerala',
    admin_uid: ngoAdminId, rating: 4.5, total_tasks_posted: 0,
    created_at: new Date().toISOString()
  }},
  { upsert: true }
);
db.user_sessions.insertOne({
  user_id: ngoAdminId,
  session_token: ngoToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('NGO_TOKEN=' + ngoToken);
"
```

## 2. Test Backend API with token

```bash
API=https://prototyped-solution.preview.emergentagent.com/api

# verify auth works
curl -s -X GET "$API/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN"

# get tasks
curl -s -X GET "$API/tasks" -H "Authorization: Bearer $ADMIN_TOKEN"

# seed demo data
curl -s -X POST "$API/admin/seed-demo" -H "Authorization: Bearer $ADMIN_TOKEN"
```

## 3. Browser testing — set cookie

```python
await page.context.add_cookies([{
    "name": "session_token",
    "value": "<TOKEN>",
    "domain": "prototyped-solution.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://prototyped-solution.preview.emergentagent.com/admin")
```

## Collections Reference

- users (user_id unique)
- ngos (ngo_id unique)
- tasks (task_id unique)
- matches (match_id unique)
- rewards, rewards_catalog, audit_logs
- user_sessions (session_token)

All MongoDB queries exclude `_id` via projection.
