# Server-Side Implementation for Cross-Device Interview Recovery

## Overview
This document provides the server-side implementation needed to support cross-device interview recovery. When implemented, users can start an interview on Laptop A, close it, and resume from Laptop B or mobile device.

## Required API Endpoints

### 1. Check Active Interview
**Endpoint:** `GET /api/interview/active`
**Authentication:** Required (JWT token)
**Description:** Returns the user's currently active/incomplete interview if one exists

#### Controller Implementation:
```javascript
// File: src/controllers/interviewController.js

const checkActiveInterview = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT token

    // Find active interview for this user
    const activeInterview = await Interview.findOne({
      user: userId,
      status: { $in: ['in-progress', 'active'] },
      endTime: null, // Not ended yet
    })
      .populate('currentQuestion')
      .populate({
        path: 'questions',
        populate: {
          path: 'question',
        },
      })
      .sort({ startTime: -1 }) // Most recent first
      .limit(1);

    if (!activeInterview) {
      return res.json({
        success: true,
        hasActiveInterview: false,
        data: null,
      });
    }

    // Calculate time elapsed and remaining
    const startTime = new Date(activeInterview.startTime);
    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 1000); // seconds
    const totalDuration = 45 * 60; // 45 minutes in seconds
    const timeRemaining = Math.max(0, totalDuration - timeElapsed);
    const isExpired = timeRemaining <= 0;

    // Get current question number
    const currentQuestionNumber = activeInterview.currentQuestionNumber || 1;
    const totalQuestions = 10; // Or get from interview settings

    // Build chat history
    const chatHistory = [];
    if (activeInterview.questions && activeInterview.questions.length > 0) {
      for (const q of activeInterview.questions) {
        // Add AI question
        chatHistory.push({
          type: 'ai',
          message: q.question?.questionText || q.questionText,
          timestamp: q.askedAt || q.createdAt,
        });

        // Add user answer if exists
        if (q.answer) {
          chatHistory.push({
            type: 'user',
            message: q.answer,
            timestamp: q.answeredAt || q.updatedAt,
          });
        }
      }
    }

    // Get current question
    const currentQuestion = activeInterview.currentQuestion
      ? {
          questionId: activeInterview.currentQuestion._id,
          question: activeInterview.currentQuestion.questionText,
          category: activeInterview.currentQuestion.category,
          difficulty: activeInterview.currentQuestion.difficulty,
          expectedAnswer: activeInterview.currentQuestion.expectedAnswer,
        }
      : null;

    // Get violations
    const violations = {
      tabSwitches: activeInterview.tabSwitches || 0,
      copyPasteCount: activeInterview.copyPasteCount || 0,
    };

    return res.json({
      success: true,
      hasActiveInterview: true,
      data: {
        interviewId: activeInterview._id,
        interviewType: activeInterview.interviewType || 'resume',
        startTime: activeInterview.startTime,
        currentQuestionNumber,
        totalQuestions,
        timeElapsed,
        timeRemaining,
        isExpired,
        currentQuestion,
        chatHistory,
        warningCount: activeInterview.warningCount || 0,
        tabSwitchCount: activeInterview.tabSwitches || 0,
        violations,
      },
    });
  } catch (error) {
    console.error('Error checking active interview:', error);
    return res.status(500).json({
      success: false,
      hasActiveInterview: false,
      message: 'Failed to check for active interview',
      error: error.message,
    });
  }
};
```

### 2. Resume Interview
**Endpoint:** `GET /api/interview/:interviewId/resume`
**Authentication:** Required (JWT token)
**Description:** Returns complete interview state for resuming

#### Controller Implementation:
```javascript
const resumeInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const userId = req.user.id;

    // Find interview and verify ownership
    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    })
      .populate('currentQuestion')
      .populate({
        path: 'questions',
        populate: {
          path: 'question',
        },
      });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found or access denied',
      });
    }

    // Check if interview is already ended
    if (interview.status === 'completed' || interview.endTime) {
      return res.status(400).json({
        success: false,
        message: 'This interview has already been completed',
      });
    }

    // Calculate time remaining
    const startTime = new Date(interview.startTime);
    const now = new Date();
    const timeElapsed = Math.floor((now - startTime) / 1000);
    const totalDuration = 45 * 60;
    const timeRemaining = Math.max(0, totalDuration - timeElapsed);

    // If expired, automatically end it
    if (timeRemaining <= 0) {
      interview.status = 'completed';
      interview.endTime = now;
      interview.autoEnded = true;
      await interview.save();

      return res.status(400).json({
        success: false,
        message: 'This interview has expired and been automatically ended',
      });
    }

    // Build chat history
    const chatHistory = [];
    if (interview.questions && interview.questions.length > 0) {
      for (const q of interview.questions) {
        chatHistory.push({
          id: `ai-${q._id}`,
          type: 'ai',
          message: q.question?.questionText || q.questionText,
          timestamp: q.askedAt || q.createdAt,
          questionId: q._id,
        });

        if (q.answer) {
          chatHistory.push({
            id: `user-${q._id}`,
            type: 'user',
            message: q.answer,
            timestamp: q.answeredAt || q.updatedAt,
            analysis: q.analysis,
          });
        }
      }
    }

    // Get current question
    const currentQuestion = interview.currentQuestion
      ? {
          questionId: interview.currentQuestion._id,
          question: interview.currentQuestion.questionText,
          category: interview.currentQuestion.category,
          difficulty: interview.currentQuestion.difficulty,
          expectedAnswer: interview.currentQuestion.expectedAnswer,
        }
      : null;

    // Update last accessed time
    interview.lastAccessedAt = now;
    await interview.save();

    return res.json({
      success: true,
      data: {
        interviewId: interview._id,
        interviewType: interview.interviewType || 'resume',
        startTime: interview.startTime,
        currentQuestionNumber: interview.currentQuestionNumber || 1,
        currentQuestion,
        chatHistory,
        timeRemaining,
        warningCount: interview.warningCount || 0,
        violations: {
          tabSwitches: interview.tabSwitches || 0,
          copyPasteCount: interview.copyPasteCount || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error resuming interview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resume interview',
      error: error.message,
    });
  }
};
```

## Database Schema Updates

### Interview Model
Add these fields to your Interview schema:

```javascript
// File: src/models/Interview.js

const interviewSchema = new mongoose.Schema({
  // ... existing fields ...

  // Cross-device support fields
  currentQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
  },
  currentQuestionNumber: {
    type: Number,
    default: 1,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  autoEnded: {
    type: Boolean,
    default: false,
  },

  // Session tracking
  tabSwitches: {
    type: Number,
    default: 0,
  },
  copyPasteCount: {
    type: Number,
    default: 0,
  },
  warningCount: {
    type: Number,
    default: 0,
  },
  lastWarningAt: {
    type: Date,
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'active', 'completed', 'terminated'],
    default: 'pending',
  },
  endTime: {
    type: Date,
  },
});

// Add index for faster active interview queries
interviewSchema.index({ user: 1, status: 1, endTime: 1 });
```

## Route Registration

Add these routes to your interview router:

```javascript
// File: src/routes/interview.js

/**
 * @route   GET /api/interview/active
 * @desc    Check for active/incomplete interview
 * @access  Private
 */
router.get('/active', authenticateToken, checkActiveInterview);

/**
 * @route   GET /api/interview/:interviewId/resume
 * @desc    Resume an interview from any device
 * @access  Private
 */
router.get('/:interviewId/resume', authenticateToken, resumeInterview);
```

## State Persistence Logic

### When User Starts Interview:
```javascript
// Update interview status
interview.status = 'in-progress';
interview.startTime = new Date();
await interview.save();
```

### When User Submits Answer:
```javascript
// Update current question tracking
interview.currentQuestionNumber = questionNumber;
interview.currentQuestion = nextQuestionId;
interview.lastAccessedAt = new Date();

// Update violations
interview.tabSwitches += req.body.tabSwitches || 0;
interview.copyPasteCount += req.body.copyPasteCount || 0;

await interview.save();
```

### When User Ends Interview:
```javascript
interview.status = 'completed';
interview.endTime = new Date();
interview.currentQuestion = null;
await interview.save();
```

## Automatic Cleanup (Optional)

Add a cron job to auto-end expired interviews:

```javascript
// File: src/jobs/cleanupInterviews.js

const cron = require('node-cron');
const Interview = require('../models/Interview');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    const expiredTime = new Date(now.getTime() - 45 * 60 * 1000); // 45 minutes ago

    const expiredInterviews = await Interview.find({
      status: { $in: ['in-progress', 'active'] },
      startTime: { $lt: expiredTime },
      endTime: null,
    });

    for (const interview of expiredInterviews) {
      interview.status = 'completed';
      interview.endTime = now;
      interview.autoEnded = true;
      await interview.save();

      console.log(`Auto-ended expired interview: ${interview._id}`);
    }

    if (expiredInterviews.length > 0) {
      console.log(`Auto-ended ${expiredInterviews.length} expired interviews`);
    }
  } catch (error) {
    console.error('Error in cleanup job:', error);
  }
});
```

## Testing the Implementation

### Test Scenario 1: Same Device Refresh
1. Start interview on Laptop A
2. Answer 2-3 questions
3. Refresh the page
4. Verify interview resumes from question 3

### Test Scenario 2: Cross-Device Resume
1. Start interview on Laptop A
2. Answer 2-3 questions
3. Close tab/browser on Laptop A
4. Open dashboard on Laptop B (or mobile)
5. Try to start new interview
6. Verify modal appears with incomplete interview
7. Click "Resume Interview"
8. Verify loads on question 3 with correct time

### Test Scenario 3: Expired Interview
1. Start interview
2. Wait 45+ minutes (or modify code for testing)
3. Try to access from any device
4. Verify shows as expired

## Export Controllers

Add to your controller exports:

```javascript
// File: src/controllers/interviewController.js

module.exports = {
  // ... existing exports ...
  checkActiveInterview,
  resumeInterview,
};
```

## Security Considerations

1. **User Verification**: Always verify the interview belongs to the authenticated user
2. **Expiry Checks**: Check if interview has expired before allowing resume
3. **Status Validation**: Ensure interview is in valid state for resuming
4. **Rate Limiting**: Add rate limits to prevent abuse
5. **Data Sanitization**: Sanitize all data before sending to client

## Summary

This server-side implementation enables:
- ✅ Cross-device interview detection
- ✅ Resume from any device with correct state
- ✅ Automatic expiry handling
- ✅ Chat history preservation
- ✅ Violation tracking across devices
- ✅ Time-aware resumption

The client will automatically sync with server data and store it in localStorage for offline access.
