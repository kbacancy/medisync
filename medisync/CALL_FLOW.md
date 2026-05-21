# MediSync — Phase 9 Video Call Flow

## Complete Call Lifecycle

### 1. Doctor opens Telehealth Center (Web App)
- Route: `/telehealth`
- `TelehealthCenter` renders with the Waiting Room panel (left), video panel (center), and Patient EHR (right)
- Supabase Realtime subscription via `WaitingRoomRealtime` keeps the waiting list live
- Center panel shows the `NoCallPlaceholder` — dark background with a video icon

### 2. Doctor sees patient in Waiting Room
- Each patient card shows name, reason, wait time, and a teal **"Start Call"** button
- Button only appears on `waiting` status patients (not those already in-call)
- A loading spinner replaces the button while the room is being provisioned

### 3. Doctor clicks "Start Call" on a patient card
- `TelehealthCenter.handleStartCall(patient)` fires
- Sets `startingCallForId` → shows spinner on the clicked card
- **POST** `/api/telehealth/create-room` with `{ appointmentId, patientId, doctorId, doctorName }`

### 4. Server creates the Daily.co room
Route: `src/app/api/telehealth/create-room/route.ts`
```
POST https://api.daily.co/v1/rooms
  name: medisync-{appointmentId}
  privacy: private
  max_participants: 2
  exp: now + 3600s
  eject_at_room_exp: true
```
- If room already exists (idempotent), GET the existing room instead
- Updates Supabase `appointments` row:
  - `room_url`, `room_name` stored
  - `status` → `"in-call"`
  - `started_at` → now
- Looks up patient's Expo push token from `push_subscriptions`
- Sends push notification to patient via Expo Push API:
  ```json
  {
    "to": "ExponentPushToken[...]",
    "title": "Dr. {doctorName} is ready for your appointment",
    "body": "Tap to join your video consultation now",
    "data": { "type": "call_started", "appointmentId", "roomUrl", "roomName", "doctorName" }
  }
  ```
- Returns `{ roomUrl, roomName, appointmentId }` to the web client

### 5. Doctor's browser automatically joins the room
- `TelehealthCenter` receives `{ roomUrl, roomName }` and sets `activeCall` state
- Center panel switches from placeholder to `VideoCallPanel`
- `VideoCallPanel` mounts and:
  1. POSTs to `/api/telehealth/get-token` with `{ roomName, userId: doctorId, userName: doctorName, isOwner: true }`
  2. Server calls `POST https://api.daily.co/v1/meeting-tokens` with `is_owner: true, enable_screenshare: true`
  3. Returns signed JWT token
  4. Dynamically imports `@daily-co/daily-js` (browser only, avoids SSR)
  5. Creates `DailyIframe.createCallObject()`
  6. Calls `callObject.join({ url: roomUrl, token })`
  7. `joined-meeting` event fires → local camera/microphone streams attached to PiP `<video>`
  8. State transitions to `"waiting"` — shows pulsing patient avatar

### 6. Patient receives push notification on phone
Two cases depending on app state:

**App in background / killed:**
- `setupCallNotificationHandler()` (registered in `app/_layout.tsx`) fires when user taps the notification
- Calls `router.push('/(patient)/call', { appointmentId, roomUrl, roomName, doctorName })`

**App in foreground:**
- `setupForegroundCallHandler()` fires immediately
- Shows `Alert.alert('Incoming Video Call', ...)` with **"Join Now"** button
- Tapping "Join Now" navigates to `/(patient)/call`

**Additional entry points:**
- `medications.tsx` — shows a green "Join Now" banner if appointment is `in-call`
- `appointments.tsx` — Supabase Realtime fires `Alert.alert` when status changes to `in-call`; "Join Call Now" button on the appointment card

### 7. Patient joins the call (Mobile App)
Route: `app/(patient)/call.tsx`
1. Requests camera + microphone permissions via `expo-camera`
2. If denied: shows alert and navigates back
3. Gets Supabase session → patient `userId`
4. POSTs to `{EXPO_PUBLIC_API_URL}/api/telehealth/get-token` with `{ roomName, userId, userName, isOwner: false }`
5. Server returns signed JWT (same endpoint, different `is_owner` flag)
6. Dynamically imports `@daily-co/react-native-daily-js`
7. `Daily.createCallObject().join({ url: roomUrl, token })`
8. `joined-meeting` → state = `"waiting"`, local PiP renders with `DailyMediaView`
9. Doctor's browser receives `participant-joined` event
10. Both parties transition to `"live"` state
11. `expo-keep-awake` prevents screen from sleeping during the call

### 8. Live video session
- Doctor's side:
  - Remote (patient) video fills the main 16:9 area via `<video ref={remoteVideoRef}>`
  - Local (doctor) PiP in top-right corner (120×90px)
  - LIVE SESSION timer counts up
  - Control bar: Mic toggle, Camera toggle, End Call, Screen Share, More
- Patient's side:
  - Remote (doctor) video fills full screen via `DailyMediaView`
  - Local (patient) PiP bottom-right (90×120px), draggable with gesture
  - Timer in top bar, doctor name shown

### 9. Doctor ends the call
1. Doctor clicks the red **End Call** button in `VideoCallPanel`
2. `callObject.leave()` gracefully disconnects
3. **POST** `/api/telehealth/end-room` with `{ appointmentId, roomName }`
4. Server:
   - `DELETE https://api.daily.co/v1/rooms/{roomName}` — destroys the room
   - Updates Supabase: `status = "completed"`, `ended_at = now`
   - Sends push notification to patient: "Your consultation has ended"
5. `onCallEnded()` callback fires → `TelehealthCenter` resets `activeCall` to `null`
6. Center panel returns to `NoCallPlaceholder`
7. Patient's Daily.co connection drops when room is deleted
8. Patient's `call-instance-destroyed` event fires → state = `"ended"`
9. Patient sees "Call ended" screen with "Return to Appointments" button

### 10. Both parties return to their dashboards
- Doctor: Telehealth Center ready for the next patient
- Patient: Navigates to `/(patient)/appointments` to see completed appointment

---

## Error Handling

| Scenario | Web behavior | Mobile behavior |
|---|---|---|
| No camera/mic permission | Daily.co prompts in browser | `expo-camera` shows system dialog; if denied, alert + navigate back |
| Room creation fails | `toast.error` on WaitingRoomCard | N/A (initiated by doctor) |
| Token fetch fails | `"connecting"` → `"error"` state with retry button | `"error"` state with "Go Back" button |
| Network drop during call | `"reconnecting"` state (network-quality-change event) | Daily.co auto-reconnects; shown as `"reconnecting"` |
| Room expires (1h) | `eject_at_room_exp: true` ejects both participants | Same — `call-instance-destroyed` fires |
| Doctor leaves before patient joins | Room is deleted, patient gets push notification | `call-instance-destroyed` → `"ended"` screen |

---

## Database Columns Required (Phase 9 additions)

The `appointments` table needs these columns added via a Supabase migration:

```sql
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS room_url    TEXT,
  ADD COLUMN IF NOT EXISTS room_name   TEXT,
  ADD COLUMN IF NOT EXISTS started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at    TIMESTAMPTZ;

-- Also update the status CHECK constraint to allow 'in-call'
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled','completed','cancelled','no_show','in-call'));
```

## Environment Variables

### Web App (`.env.local`)
```
DAILY_API_KEY=549a4365986cd7f213f5ea73d7add275bd8e1979c04b469c2b622df3e99c24e8
NEXT_PUBLIC_DAILY_DOMAIN=bacancymedisync.daily.co
```

### Mobile App (`.env`)
```
EXPO_PUBLIC_DAILY_DOMAIN=bacancymedisync.daily.co
EXPO_PUBLIC_API_URL=http://localhost:3000   # or LAN IP for physical device
```

## Package Dependencies Added

### Web (`@daily-co/daily-js`)
```bash
npm install @daily-co/daily-js
```
Dynamically imported inside `VideoCallPanel` to avoid Next.js SSR errors.

### Mobile (`@daily-co/react-native-daily-js`, `expo-camera`, `expo-keep-awake`)
```bash
npm install @daily-co/react-native-daily-js
npx expo install expo-camera expo-keep-awake
```
Requires a **development build** (`expo-dev-client`) — WebRTC is not supported in Expo Go.
