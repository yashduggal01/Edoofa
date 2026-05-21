# ✅ Verification Checklist — British Auction RFQ System

**Use this checklist to verify all features are working correctly**

---

## 🚀 Pre-Startup Verification

### Backend Setup
- [ ] Navigate to `/backend` folder
- [ ] Run `npm install` (check for no errors)
- [ ] Run `npm run dev`
- [ ] ✅ Backend starts on `http://localhost:5000`
- [ ] ✅ Database file created at `backend/db/auction.db`
- [ ] ✅ No error messages in console

### Frontend Setup
- [ ] Open new terminal, navigate to `/frontend`
- [ ] Run `npm install` (check for no errors)
- [ ] Run `npm run dev`
- [ ] ✅ Frontend starts on `http://localhost:5173`
- [ ] ✅ No build errors or warnings

### API Health Check
- [ ] Open browser and test: `http://localhost:5000/api/health`
- [ ] ✅ Response: `{"status":"ok","timestamp":"..."}`

---

## 📋 Feature Verification

### 1. RFQ Creation (§4.1, §4.2, §4.5)

**Test:**
1. Open frontend: `http://localhost:5173`
2. Click "+ New RFQ" button
3. Fill form with:
   - Name: "Test RFQ"
   - Bid Start: Now
   - Bid Close: Now + 30 min
   - Forced Close: Now + 60 min *(MUST be > Bid Close)*
   - Pickup Date: Any future date
   - Trigger Window: 5 min
   - Extension Duration: 3 min
   - Trigger Type: "BID_RECEIVED"
4. Click "Create RFQ"

**Expected Results:**
- [ ] Form validates (no error for forced_close < bid_close)
- [ ] ✅ RFQ created successfully
- [ ] ✅ Redirects to details page
- [ ] ✅ RFQ appears in listing with status "ACTIVE"

---

### 2. Listing Page (§4.6)

**Test:** Open `http://localhost:5173` (home page)

**Should Display:**
- [ ] ✅ Auction Dashboard heading
- [ ] ✅ "+ New RFQ" button
- [ ] ✅ Stats cards: Total, Active, Closed, Force Closed
- [ ] ✅ RFQ table with columns:
  - ID
  - RFQ Name
  - Status (badge)
  - Lowest Bid
  - Bid Count
  - Current Close
  - Forced Close
  - Trigger Type
  - "View →" link

**Verify:**
- [ ] ✅ Status badge shows correct value
- [ ] ✅ Lowest Bid shows "—" (no bids yet)
- [ ] ✅ Bid Count shows 0
- [ ] ✅ Times are formatted correctly

---

### 3. Details Page (§4.7)

**Test:** Click "View →" on any RFQ

**Should Display:**
- [ ] ✅ RFQ name with status badge
- [ ] ✅ Stats cards:
  - Current L1 Bid (or "—")
  - Total Bids
  - Extensions (count)
  - Trigger Window (X min)
  - Extension (Y min)
- [ ] ✅ Countdown timer showing time remaining
- [ ] ✅ "📊 Live Bid Rankings" table (empty or with bids)
- [ ] ✅ "📋 Activity Log" section
- [ ] ✅ "💰 Submit Bid" form on right
- [ ] ✅ "⚙️ Auction Configuration" card

---

### 4. Bid Submission (§4.3, §7)

**Test:** Fill and submit the "Submit Bid" form

**With Valid Data:**
```
Carrier: "DHL Express"
Price: 50000
Freight: 10000
Origin: 5000
Destination: 5000
Transit: "3-5 days"
Validity: "30 days"
```

**Expected Results:**
- [ ] ✅ Success message: "Bid submitted!"
- [ ] ✅ Bid rank shown: "Your rank: L1"
- [ ] ✅ Extension message: "⏰ Auction extended to [time]"
- [ ] ✅ Form clears automatically
- [ ] ✅ Details page updates with new bid

**Verify Bid Details Page Updated:**
- [ ] ✅ BidTable shows new bid as L1
- [ ] ✅ Current L1 Bid stat updated
- [ ] ✅ Total Bids count incremented
- [ ] ✅ Countdown timer changed (extended)
- [ ] ✅ Extension count incremented
- [ ] ✅ Activity Log shows bid submission

---

### 5. Ranking Logic (§8)

**Test:** Submit multiple bids with different prices

**Scenario:**
1. Bid 1: Price 50000 → L1
2. Bid 2: Price 48000 → L1 (Bid 1 becomes L2)
3. Bid 3: Price 52000 → L2 (or L3)

**Expected Results:**
- [ ] ✅ Bids sorted by price ascending
- [ ] ✅ L1 is always lowest price
- [ ] ✅ Rank labels update (L1, L2, L3...)
- [ ] ✅ Previous L1 drops to L2
- [ ] ✅ Activity log shows each bid

**Test Same Price (Tie-Breaker):**
1. Bid 1: Price 50000 at T+0 → L1
2. Bid 2: Price 50000 at T+10sec → L2

- [ ] ✅ Bid 1 (earlier) stays L1
- [ ] ✅ Bid 2 (later) becomes L2

---

### 6. Extension Logic (§4.4) ⭐ CORE

**Test:** Watch close time change with extensions

**Scenario:**
- Initial Close: 10:30
- Trigger Window: 5 min
- Extension: +3 min

1. Submit bid at 10:27 (within 5-min window)
   - [ ] ✅ Close extends to 10:33
   - [ ] ✅ Activity log shows "TIME_EXTENDED"

2. Submit bid at 10:33 (within new window)
   - [ ] ✅ Close extends to 10:36
   - [ ] ✅ Another extension logged

3. Submit bid at 10:34 (NOT in trigger window anymore?)
   - [ ] ✅ May or may not extend (depends on trigger config)
   - [ ] ✅ Activity log is updated accordingly

---

### 7. Trigger Window & Bid Time (§9)

**Test:** Verify bid accepted within close time

**Scenario:**
- Close Time: 10:30 (5 min from now)

1. Submit bid at 10:28 (before close)
   - [ ] ✅ Bid accepted
   - [ ] ✅ Shows success message

2. Try to submit bid after close time
   - [ ] ✅ Error: "Bid time exceeds current close time"

3. Try to submit bid after forced close
   - [ ] ✅ Error: "No bids allowed after forced close time (§4.5)"

---

### 8. Status Management (§6, §14)

**Test:** Watch status change as time passes

**Wait Until Current Close Time:**
- [ ] ✅ Status changes to "CLOSED" (red badge)
- [ ] ✅ Countdown timer shows "🔔 Auction Closed"
- [ ] ✅ Submit Bid form shows warning: "Auction is CLOSED"
- [ ] ✅ Cannot submit bids

**Wait Until Forced Close Time:**
- [ ] ✅ Status changes to "FORCE_CLOSED" (dark badge)
- [ ] ✅ Countdown timer shows "🔒 Force Closed"
- [ ] ✅ Activity log shows "AUCTION_FORCE_CLOSED" event

---

### 9. Activity Log (§4.8)

**Test:** Check activity log displays all events

**Should Show Events (in reverse chronological order):**
- [ ] ✅ BID_SUBMITTED events (💰 icon)
- [ ] ✅ TIME_EXTENDED events (⏰ icon)
- [ ] ✅ AUCTION_CLOSED event (🔔 icon)
- [ ] ✅ AUCTION_FORCE_CLOSED event (🔒 icon)

**Each Event Shows:**
- [ ] ✅ Icon and type
- [ ] ✅ Description (e.g., "Supplier Name submitted bid ₹50,000")
- [ ] ✅ Reason badge (BID_RECEIVED, RANK_CHANGE, L1_CHANGE)
- [ ] ✅ Timestamp (time and date)

---

### 10. Validation Rules (§4.5) ⭐ STRICT

**Test: forced_close_time > bid_close_time**
1. Try to create RFQ with Forced Close <= Bid Close
2. [ ] ✅ Error message: "Forced Close Time must be greater than Bid Close Time"
3. [ ] ✅ Form does not submit

**Test: Bid Price < Current L1**
1. Bid 1: 50000 → L1
2. Try Bid 2: 55000 (higher price)
3. [ ] ✅ Error: "Bid price must be lower than current lowest bid"

**Test: No Bids After Forced Close**
1. Wait until forced close time
2. Try to submit bid
3. [ ] ✅ Error: "No bids allowed after forced close time (§4.5)"

---

### 11. Countdown Timer (§4.7)

**Test:** Check timer behavior

**Normal Mode:**
- [ ] ✅ Shows HH:MM:SS format
- [ ] ✅ Decreases every second
- [ ] ✅ Shows "Closes at [time]"

**Urgent Mode (<5 min):**
- [ ] ✅ Text color changes to red
- [ ] ✅ Shows "⚡ Less than 5 min remaining"

**Closed Mode:**
- [ ] ✅ Shows "🔔 Auction Closed" or "🔒 Force Closed"
- [ ] ✅ No countdown display

---

### 12. Error Handling

**Test Various Error Scenarios:**

1. **Missing Fields**
   - [ ] ✅ Error: "Carrier name and price are required"

2. **Invalid Price Format**
   - [ ] ✅ Error: "Price must be a positive number"

3. **RFQ Not Found**
   - Open browser directly to: `/rfq/9999`
   - [ ] ✅ Error displayed

4. **Server Connection Lost**
   - Stop backend
   - Try to create RFQ or submit bid
   - [ ] ✅ Error message shown

---

## 🔧 API Verification (cURL)

### Test All Endpoints

**1. Health Check**
```bash
curl http://localhost:5000/api/health
```
- [ ] ✅ Returns `{"status":"ok",...}`

**2. Create RFQ**
```bash
curl -X POST http://localhost:5000/api/rfq/create \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test",
    "bid_start_time":"2026-04-25T10:00:00Z",
    "bid_close_time":"2026-04-25T10:30:00Z",
    "forced_close_time":"2026-04-25T11:00:00Z",
    "trigger_window":5,
    "extension_duration":3,
    "trigger_type":"BID_RECEIVED"
  }'
```
- [ ] ✅ Returns 201 with RFQ ID

**3. List RFQs**
```bash
curl http://localhost:5000/api/rfq
```
- [ ] ✅ Returns array of RFQs

**4. Get RFQ Details**
```bash
curl http://localhost:5000/api/rfq/1
```
- [ ] ✅ Returns RFQ with bids and events

**5. Submit Bid**
```bash
curl -X POST http://localhost:5000/api/rfq/1/bid \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_name":"Test Supplier",
    "price":50000
  }'
```
- [ ] ✅ Returns 201 with bid details

**6. Get Bids**
```bash
curl http://localhost:5000/api/rfq/1/bids
```
- [ ] ✅ Returns ranked bids array

**7. Get Events**
```bash
curl http://localhost:5000/api/rfq/1/events
```
- [ ] ✅ Returns activity log array

---

## 📊 Database Verification

### Check Database File
```bash
ls -la backend/db/auction.db
```
- [ ] ✅ File exists and has size > 0

### Check Tables Created
```bash
sqlite3 backend/db/auction.db ".tables"
```
- [ ] ✅ Shows: `rfqs bids events`

### Check Sample Data
```bash
sqlite3 backend/db/auction.db "SELECT COUNT(*) FROM rfqs;"
```
- [ ] ✅ Shows correct number of RFQs

---

## 🎯 Performance Verification

### Response Times
1. List RFQs (10 items): 
   - [ ] ✅ < 100ms

2. Get RFQ with bids/events:
   - [ ] ✅ < 200ms

3. Submit bid (11-step process):
   - [ ] ✅ < 300ms

### UI Responsiveness
- [ ] ✅ No lag when clicking buttons
- [ ] ✅ Forms respond immediately
- [ ] ✅ Timer updates smoothly
- [ ] ✅ Ranking updates appear instantly

---

## 🏆 Full Workflow Verification

**Complete End-to-End Test:**

1. **Create RFQ** ✅
   - [ ] Form validates
   - [ ] RFQ appears in listing
   - [ ] Status: ACTIVE

2. **Submit First Bid** ✅
   - [ ] Bid accepted
   - [ ] Ranked as L1
   - [ ] Extension triggered

3. **Submit Second Bid** ✅
   - [ ] Ranked correctly
   - [ ] Previous L1 becomes L2
   - [ ] Extension triggered again

4. **Monitor Activity** ✅
   - [ ] All events logged
   - [ ] Activity log shows correct sequence
   - [ ] Reasons correct (BID_RECEIVED, L1_CHANGE, etc.)

5. **Watch Status Change** ✅
   - [ ] Manually wait or advance time
   - [ ] Status changes to CLOSED
   - [ ] Cannot submit bids
   - [ ] Eventually FORCE_CLOSED

6. **Verify Data Persistence** ✅
   - [ ] Refresh page - data still there
   - [ ] Stop and restart backend - data persists
   - [ ] Database file intact

---

## ✅ Final Sign-Off

Once all items above are checked, the system is verified as:

- [x] **Fully Functional** - All features working
- [x] **Correctly Implemented** - Requirements satisfied
- [x] **Well-Validated** - Input validation works
- [x] **Error-Handled** - Graceful error messages
- [x] **Production-Ready** - No known issues

**System Status: ✅ VERIFIED & READY**

---

**Verification Date:** _____________  
**Verified By:** _____________  
**Notes:** _________________________________________________

---

*Use this checklist regularly to ensure system health and catch regressions.*
