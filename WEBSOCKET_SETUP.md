# WebSocket Timer Setup Guide

## 📦 Install Required Package

```bash
cd /Users/suyashagrahari/Desktop/Interview/Interview_Server
npm install socket.io
```

## 🔧 Server Setup

### Step 1: Update server.js (or app.js)

Find your server file (usually `src/server.js` or `src/app.js`) and modify it:

**Before:**
```javascript
const app = require('./app');
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**After:**
```javascript
const app = require('./app');
const http = require('http');
const { setupWebSocket } = require('./config/websocket');

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
const io = setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket enabled`);
});

module.exports = { app, server, io };
```

### Step 2: Update Interview Controllers

Add timer initialization when interview starts:

**File:** `src/controllers/interviewController/startInterview.js` or where interview starts

```javascript
const { getTimerService } = require('../../config/websocket');

// After creating/starting interview
const timerService = getTimerService();
timerService.startTimer(interview._id, null);
```

**File:** `src/controllers/interviewController/endInterview.js`

```javascript
const { getTimerService } = require('../../config/websocket');

// Before ending interview
const timerService = getTimerService();
timerService.stopTimer(interviewId);
```

## 🖥️ Frontend Setup

### Step 1: Install Socket.io Client

```bash
cd /Users/suyashagrahari/Desktop/Interview/Interview_Practice
npm install socket.io-client
```

### Step 2: Use the Timer Hook in Interview Page

**File:** `src/app/interview/page.tsx`

Add the hook:

```typescript
import { useInterviewTimer } from '@/hooks/useInterviewTimer';

// Inside your component
const {
  timeRemaining,
  isExpired,
  isConnected,
  formatTime,
} = useInterviewTimer(interviewId, user?.id);

// Display timer
<div className="timer">
  {isConnected ? (
    <span>{formatTime(timeRemaining)}</span>
  ) : (
    <span>Connecting...</span>
  )}
</div>

// Handle expiry
useEffect(() => {
  if (isExpired) {
    // Auto-end interview
    handleAutoEndInterview();
  }
}, [isExpired]);
```

## 🔄 How It Works

### Timer Flow:
```
1. User starts interview
   ↓
2. Server creates interview record with startedAt
   ↓
3. WebSocket timer service starts (updates every second)
   ↓
4. Client connects via WebSocket
   ↓
5. Server emits timer:update every second
   ↓
6. Client receives and displays updated time
   ↓
7. When time hits 0:
   - Server auto-ends interview
   - Emits interview:expired
   - Client shows expiry message
```

### Cross-Device Sync:
```
Device A: 15:00 remaining
   ↓ (User switches devices)
Device B: Connects to WebSocket
   ↓ (Server sends current time)
Device B: 15:00 remaining (same!)
```

## 📡 WebSocket Events

### Client → Server:
- `interview:join` - Join interview room
- `interview:leave` - Leave interview room
- `timer:get` - Get current time

### Server → Client:
- `interview:joined` - Confirmation of join
- `timer:update` - Time update (every second)
- `timer:current` - Current time (on request)
- `interview:expired` - Interview time expired

## 🧪 Testing

### Test WebSocket Connection:

**1. Start Server:**
```bash
cd Interview_Server
npm start
```

**2. Check Logs:**
```
🚀 Server running on port 3001
🔌 WebSocket enabled
```

**3. Start Interview:**
- Watch console for: `⏱️  Starting timer for interview: <id>`

**4. Check Updates:**
- Open browser console
- Should see: `⏱️  Timer update: { timeRemaining: 2699, ... }`

### Test Timer Accuracy:

```javascript
// In browser console
const socket = io('http://localhost:3001');
socket.emit('interview:join', { interviewId: 'YOUR_ID', userId: 'YOUR_USER_ID' });

socket.on('timer:update', (data) => {
  console.log('Time:', data.timeRemaining);
});
```

## ⚙️ Configuration

### Change Interview Duration:

**Server:** `src/services/websocket/interviewTimer.js`
```javascript
const totalDuration = 45 * 60; // Change 45 to desired minutes
```

**Client:** `src/hooks/useInterviewTimer.ts`
```javascript
const [timeRemaining, setTimeRemaining] = useState<number>(2700); // Update default
```

### Change Update Frequency:

**Server:** `src/services/websocket/interviewTimer.js`
```javascript
setInterval(async () => {
  // Update logic
}, 1000); // Change 1000 to desired milliseconds
```

## 🔒 Security Considerations

1. **Authentication:** Add JWT verification to WebSocket connections
2. **Room Validation:** Verify user has access to interview
3. **Rate Limiting:** Prevent timer manipulation

**Example Auth:**
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT
  next();
});
```

## 🐛 Troubleshooting

### Issue: Timer not updating
**Fix:**
1. Check server logs for timer start message
2. Verify WebSocket connection in browser console
3. Check for firewall blocking WebSocket port

### Issue: Time desynchronized
**Fix:**
1. Restart server to clear all timers
2. Verify server time is accurate
3. Check database `startedAt` field

### Issue: Multiple timers running
**Fix:**
```javascript
// Add to controller before starting new timer
const timerService = getTimerService();
timerService.stopTimer(interviewId); // Stop existing
timerService.startTimer(interviewId); // Start fresh
```

## 📊 Database Schema

The Interview model now includes:

```javascript
{
  timeRemaining: {
    type: Number,
    default: 2700, // 45 minutes in seconds
  },
  lastTimeUpdate: {
    type: Date,
    default: null,
  }
}
```

This is automatically updated every second by the WebSocket service.

## 🚀 Production Deployment

For production:

1. **Use Redis for WebSocket scaling:**
```bash
npm install @socket.io/redis-adapter redis
```

2. **Setup Redis adapter:**
```javascript
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

3. **Environment variables:**
```
REDIS_URL=redis://localhost:6379
CLIENT_URL=https://your-frontend.com
```

4. **Load balancing:** Use sticky sessions for WebSocket

## ✅ Verification Checklist

- [ ] `socket.io` installed on server
- [ ] `socket.io-client` installed on client
- [ ] WebSocket setup in server.js
- [ ] Timer service initialized
- [ ] Interview controllers updated
- [ ] Frontend hook implemented
- [ ] Timer displays on interview page
- [ ] Auto-end works when time expires
- [ ] Cross-device sync tested

---

## 🎉 Success Indicators

**Server Console:**
```
⏱️  Starting timer for interview: 673f9a2b8e8c4d001f123456
🔌 Client connected: abc123
📥 User 673f9a2b joining interview 673f9a2b8e8c4d001f123456
```

**Client Console:**
```
🔌 WebSocket connected
✅ Joined interview room: { interviewId: '...', message: '...' }
⏱️  Timer update: { timeRemaining: 2699, timeElapsed: 1, isExpired: false }
```

**UI:**
- Timer counts down every second
- Shows accurate time across devices
- Auto-ends when time expires
