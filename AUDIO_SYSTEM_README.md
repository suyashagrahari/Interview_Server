# Audio System Documentation

## Overview

The interview platform includes a Text-to-Speech (TTS) audio system that generates and streams question audio to users in real-time via WebSocket.

## Features

- 🎵 **Real-time Audio Generation**: Questions are converted to speech and sent immediately
- 🔄 **Automatic Cleanup**: Old audio files are automatically deleted when new questions are generated
- 📁 **Smart File Naming**: Files are named based on `user-{userId}-question-{questionId}-{timestamp}.mp3`
- 📡 **Dual Delivery**: Audio is sent both as base64 (primary) and URL (fallback)
- 🎯 **User-Specific**: Each user has their own audio files that are cleaned up individually

## Audio Flow

```
┌─────────────┐
│ User submits│
│   answer    │
└─────┬───────┘
      │
      ▼
┌─────────────────────┐
│  Backend generates  │
│   next question     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────┐
│ TTS Service:                │
│ 1. Delete old user audio    │
│ 2. Generate new audio file  │
│ 3. Create base64 encoding   │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ WebSocket emits:            │
│ - Question text             │
│ - Audio base64              │
│ - Audio URL                 │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Frontend:                   │
│ 1. Creates blob from base64 │
│ 2. Auto-plays audio         │
└─────────────────────────────┘
```

## File Structure

### Backend
```
Interview_Server/
├── src/
│   ├── services/
│   │   └── ttsService/
│   │       └── index.js          # TTS service with cleanup logic
│   └── websocket/
│       └── interviewHandler.js   # WebSocket handler for audio
├── uploads/
│   ├── voice/                    # Question audio files
│   └── audio/                    # Other audio files
├── test-audio-generation.js      # Test script
└── cleanup-audio.js              # Manual cleanup script
```

### Frontend
```
Interview_Practice/
└── src/
    ├── hooks/
    │   ├── useAudioPlayer.ts           # Audio playback hook
    │   └── useInterviewWebSocket.ts    # WebSocket connection
    └── components/
        └── interview/
            └── audio-player.tsx         # Audio player UI
```

## Usage

### Backend Commands

```bash
# Test audio generation
npm run test:audio

# Manual cleanup (24 hours old)
npm run cleanup:audio

# Cleanup files older than 1 hour
npm run cleanup:audio:1h

# Cleanup files older than 12 hours
npm run cleanup:audio:12h

# Generate speech interactively
npm run generate-speech
```

### API Reference

#### TTS Service

```javascript
const ttsService = require('./src/services/ttsService');

// Generate speech with automatic cleanup
const result = await ttsService.generateSpeechStream(
  'Hello, this is a question',  // text
  null,                          // fileName (auto-generated if null)
  'user123',                     // userId (for cleanup)
  'question456'                  // questionId
);

// Result:
{
  success: true,
  filePath: '/path/to/file.mp3',
  fileName: 'user-user123-question-question456-1759662687602.mp3',
  url: '/uploads/voice/user-user123-question-question456-1759662687602.mp3',
  audioBase64: 'base64encodedstring...',
  audioBuffer: Buffer
}
```

## File Naming Convention

Audio files follow this pattern:
```
user-{userId}-question-{questionId}-{timestamp}.mp3
```

Examples:
- `user-507f1f77bcf86cd799439011-question-q1-1759662687602.mp3`
- `user-507f1f77bcf86cd799439012-question-q2-1759662688696.mp3`

## Automatic Cleanup

When a new question is generated for a user:

1. Service searches for existing files: `user-{userId}-question-*.mp3`
2. Deletes all matching files
3. Creates new file for current question

**Example:**
```javascript
// User user123 receives question1
// File created: user-user123-question-question1-123.mp3

// User user123 answers and receives question2
// File deleted: user-user123-question-question1-123.mp3
// File created: user-user123-question-question2-456.mp3
```

## Configuration

### Environment Variables

#### Backend (.env)
```env
PORT=3001
# ... other configs
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Audio Format

- **Format**: MP3 (MPEG Layer 3)
- **MIME Type**: `audio/mpeg`
- **Encoding**: Base64 for WebSocket transmission
- **Delivery**: Blob URL for browser playback

## WebSocket Events

### Server → Client

#### `question:first`
Sent when first question is generated:
```javascript
{
  success: true,
  data: {
    question: { ... },
    questionNumber: 1,
    audio: {
      audioBase64: 'base64string...',
      url: '/uploads/voice/...',
      fileName: 'user-...-question-....mp3',
      mimeType: 'audio/mpeg'
    }
  }
}
```

#### `question:next`
Sent when next question is generated:
```javascript
{
  success: true,
  data: {
    question: { ... },
    questionNumber: 2,
    audio: {
      audioBase64: 'base64string...',
      url: '/uploads/voice/...',
      fileName: 'user-...-question-....mp3',
      mimeType: 'audio/mpeg'
    }
  }
}
```

## Frontend Audio Player

### Features
- ▶️ Play/Pause
- 🔄 Replay
- 📊 Progress bar with seek
- ⏱️ Time display (current/total)
- 🔊 Volume indicator
- 🎯 Auto-play support

### Usage
```tsx
import AudioPlayer from '@/components/interview/audio-player';

<AudioPlayer
  audioData={{
    audioBase64: '...',
    url: '/uploads/voice/...',
    fileName: '...',
    mimeType: 'audio/mpeg'
  }}
  autoPlay={true}
/>
```

## Error Handling

The system includes multiple fallback mechanisms:

1. **Primary**: Base64 → Blob URL
   - Most reliable for streaming
   - Works offline once loaded

2. **Fallback**: Direct URL
   - Used if base64 fails
   - Requires server access

3. **Error Events**:
   - `audio:error` - Audio loading failed
   - Logs detailed error information
   - User-friendly error messages

## Performance

- **File Size**: ~30-50KB per question (average 5-10 seconds of speech)
- **Generation Time**: ~1-2 seconds
- **Delivery**: Instant via WebSocket
- **Cleanup**: Automatic, no manual intervention needed

## Troubleshooting

### Audio not playing?

1. Check browser console for errors
2. Verify `.env.local` has correct `NEXT_PUBLIC_API_URL`
3. Check if audio file exists in `uploads/voice/`
4. Verify file has `.mp3` extension
5. Check WebSocket connection status

### Files accumulating?

1. Run manual cleanup: `npm run cleanup:audio`
2. Check automatic cleanup is working: `npm run test:audio`
3. Verify userId is being passed correctly

### Poor audio quality?

The system uses Google TTS (gTTS) which provides decent quality. For better quality:
- Consider upgrading to Google Cloud Text-to-Speech API
- Use AWS Polly
- Implement Azure Speech Services

## Future Enhancements

- [ ] Chunked streaming for large audio
- [ ] Multiple voice options
- [ ] Playback speed control
- [ ] Audio caching for repeated phrases
- [ ] Background cleanup scheduler
- [ ] Voice customization per user
- [ ] Audio compression optimization

## Support

For issues or questions:
1. Check logs in `/logs` directory
2. Run `npm run test:audio` to verify setup
3. Check console for detailed error messages
4. Review `AUDIO_FIXES_SUMMARY.md` for recent changes
