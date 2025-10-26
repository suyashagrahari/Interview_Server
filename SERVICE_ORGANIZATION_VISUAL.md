# 📊 Visual Service Organization

## Color-Coded Service Map

```
src/services/

🟢 RESUME SERVICES (5 services - All clearly named with "resume" prefix)
├── resumeAnalysisService/                    ✅ Answer analysis & scoring
├── resumeQuestionGenerationService/          ✅ Question generation from resume
├── resumeQuestionManagementService/          ✅ Question lifecycle management
├── resumeInterviewService/                   ✅ Interview CRUD & lifecycle
└── resumeWebSocketHandlers/                  ✅ Real-time WebSocket operations

🔵 JOB DESCRIPTION SERVICES (4 services - All clearly named with "jobDescription" prefix)
├── jobDescriptionAnalysisService/            ✅ Answer analysis & scoring
├── jobDescriptionQuestionGenerationService/  ✅ Question generation from JD
├── jobDescriptionQuestionManagementService.js ✅ Question management
└── jobDescriptionWebSocketHandlers/          ✅ Real-time WebSocket operations

⚪ SHARED SERVICES (6 services - Used by both interview types)
├── sentimentAnalysisService/                 ✅ Sentiment analysis
├── chatgptService/                           ✅ ChatGPT API integration
├── ttsService/                               ✅ Text-to-speech
├── unifiedQuestionManagementService/         ✅ Unified question layer
├── interviewStateService.js                  ✅ State management
└── websocket/                                ✅ WebSocket router

🟡 DEPRECATED SERVICES (4 services - Do not use in new code)
├── analysisService/                          ⚠️ Use resume/JD specific instead
├── questionGenerationService/                ⚠️ Use resume/JD specific instead  
├── questionManagementService/                ⚠️ Use resumeQuestionManagementService
└── interviewService/                         ⚠️ Use resumeInterviewService
```

---

## Service Dependency Graph

### Resume Interview Flow

```
Resume Controller
       ↓
┌──────┴───────┐
│              │
↓              ↓
resumeInterviewService    resumeQuestionGenerationService
       ↓                           ↓
resumeQuestionManagementService    resumeAnalysisService
       ↓                           ↓
resumeWebSocketHandlers ←──────────┘
       ↓
┌──────┴───────┐
│              │
↓              ↓
sentimentAnalysis    ttsService
```

### Job Description Interview Flow

```
JD Controller
       ↓
┌──────┴───────┐
│              │
↓              ↓
jobDescriptionQuestionGenerationService    jobDescriptionAnalysisService
       ↓                                           ↓
jobDescriptionQuestionManagementService            │
       ↓                                           │
jobDescriptionWebSocketHandlers ←──────────────────┘
       ↓
┌──────┴───────┐
│              │
↓              ↓
sentimentAnalysis    ttsService
```

---

## Quick Service Finder

### "I need to analyze an answer..."
- **Resume interview?** → `resumeAnalysisService`
- **Job description interview?** → `jobDescriptionAnalysisService`

### "I need to generate questions..."
- **From a resume?** → `resumeQuestionGenerationService`
- **From a job description?** → `jobDescriptionQuestionGenerationService`

### "I need to manage question lifecycle..."
- **Resume interview?** → `resumeQuestionManagementService`
- **Job description interview?** → `jobDescriptionQuestionManagementService`

### "I need to manage interview lifecycle..."
- **Resume interview?** → `resumeInterviewService`

### "I need WebSocket real-time operations..."
- **Resume interview?** → `resumeWebSocketHandlers`
- **Job description interview?** → `jobDescriptionWebSocketHandlers`

### "I need sentiment analysis / ChatGPT / TTS..."
- **Any interview type** → Use the shared services (no prefix needed)

---

## Service Size Comparison

```
Service Type              Folder Count   File Count   Avg Files/Folder
─────────────────────────────────────────────────────────────────────
Resume Services                 5           50+            10
Job Description Services        4           40+            10
Shared Services                 6           30+             5
Deprecated Services             4           40+            10
─────────────────────────────────────────────────────────────────────
TOTAL                          19          160+             8
```

---

## Naming Convention Rules

### ✅ GOOD - Clear Service Names
```
resumeAnalysisService           → Clear: It's for resume interviews
jobDescriptionAnalysisService   → Clear: It's for JD interviews  
sentimentAnalysisService        → Clear: Shared service, no prefix needed
```

### ❌ BAD - Ambiguous Service Names (Deprecated)
```
analysisService                 → Unclear: Resume or JD?
questionManagementService       → Unclear: Only for resume but doesn't say so
interviewService                → Unclear: Has resume-specific functions but generic name
```

---

## File Naming Patterns

### Resume Services Pattern
```
resume{ServiceName}Service/
├── index.js                    // Exports ResumeXXXService class
├── dependencies.js             // Shared dependencies
├── function1.js               // Individual function
├── function2.js               // Individual function
└── ...
```

### Job Description Services Pattern
```
jobDescription{ServiceName}Service/
├── index.js                    // Exports JobDescriptionXXXService class
├── dependencies.js             // Shared dependencies
├── function1.js               // Individual function
├── function2.js               // Individual function
└── ...
```

---

## Migration Quick Reference

| Old Service (Deprecated) | New Service (Resume) | New Service (JD) |
|-------------------------|---------------------|------------------|
| `analysisService` | `resumeAnalysisService` | `jobDescriptionAnalysisService` |
| `questionGenerationService` | `resumeQuestionGenerationService` | `jobDescriptionQuestionGenerationService` |
| `questionManagementService` | `resumeQuestionManagementService` | `jobDescriptionQuestionManagementService` |
| `interviewService` | `resumeInterviewService` | N/A (no JD equivalent yet) |

---

## Directory Tree View

```
services/
│
├─── 🟢 RESUME (5 folders)
│    ├── resumeAnalysisService/
│    ├── resumeQuestionGenerationService/
│    ├── resumeQuestionManagementService/
│    ├── resumeInterviewService/
│    └── resumeWebSocketHandlers/
│
├─── 🔵 JOB DESCRIPTION (4 items)
│    ├── jobDescriptionAnalysisService/
│    ├── jobDescriptionQuestionGenerationService/
│    ├── jobDescriptionQuestionManagementService.js
│    └── jobDescriptionWebSocketHandlers/
│
├─── ⚪ SHARED (6 items)
│    ├── sentimentAnalysisService/
│    ├── chatgptService/
│    ├── ttsService/
│    ├── unifiedQuestionManagementService/
│    ├── interviewStateService.js
│    └── websocket/
│
└─── 🟡 DEPRECATED (4 folders - See DEPRECATED.md in each)
     ├── analysisService/
     ├── questionGenerationService/
     ├── questionManagementService/
     └── interviewService/
```

---

**Legend:**
- 🟢 Green = Resume-specific services
- 🔵 Blue = Job Description-specific services
- ⚪ White = Shared services (used by both)
- 🟡 Yellow = Deprecated (do not use)

**Version**: 3.0
**Last Updated**: October 26, 2025
**Status**: Production Ready ✅
