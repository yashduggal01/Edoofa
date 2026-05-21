# 🔧 Troubleshooting Guide - API Issues

## Step 1: Check Backend is Running

Open this in your browser and you should see JSON:
```
https://edoofa.onrender.com/api/health
```

Expected response:
```json
{"status":"ok","database":"sqlite","timestamp":"..."}
```

---

## Step 2: Check Frontend Can Reach Backend

Open **Developer Console** (F12) in your browser, then run:

```javascript
fetch('https://edoofa.onrender.com/api/rfq')
  .then(r => r.json())
  .then(d => console.log('RFQs:', d))
  .catch(e => console.error('Error:', e))
```

You should see RFQ data in the console.

---

## Step 3: Test Creating an RFQ

In console, run:

```javascript
const now = new Date();
const start = new Date(now.getTime() - 30000);  // 30 sec ago
const close = new Date(now.getTime() + 300000); // 5 min from now
const forced = new Date(now.getTime() + 360000); // 6 min from now

const body = {
  name: 'Test RFQ',
  lane_origin: 'Mumbai',
  lane_destination: 'Delhi',
  cargo_type: 'Electronics',
  estimated_volume: '2 boxes',
  budget: 50000,
  bid_start_time: start.toISOString().slice(0, 16).replace('T', ' '),
  bid_close_time: close.toISOString().slice(0, 16).replace('T', ' '),
  forced_close_time: forced.toISOString().slice(0, 16).replace('T', ' '),
  pickup_date: '2026-05-25',
  trigger_window: 5,
  extension_duration: 3,
  trigger_type: 'BID_RECEIVED'
};

fetch('https://edoofa.onrender.com/api/rfq/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
  .then(r => r.json())
  .then(d => console.log('Created RFQ:', d))
  .catch(e => console.error('Error:', e))
```

---

## If You See CORS Errors

The error will say `No 'Access-Control-Allow-Origin'...`

**Solution:** Check that Render backend has CORS enabled:
- Go to Render dashboard → Backend service
- Environment Variables should have: `CORS_ORIGIN=*`

---

## If API Returns 404

Check the backend logs in Render dashboard to see what's happening.

