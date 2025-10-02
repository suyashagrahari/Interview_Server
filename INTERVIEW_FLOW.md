# New Interview Flow - Enhanced with Follow-up Questions

## Overview
The new interview system implements a sophisticated alternating pattern between pool questions and follow-up questions, creating a total of 18 questions per interview for comprehensive candidate evaluation.

## Flow Pattern
```
Pool Question → Follow-up → Pool Question → Follow-up → ... (18 total)
```

## Detailed Flow

### 1. Start Interview API
- **Endpoint**: `POST /api/interviews/start`
- **Action**:
  - Creates interview record
  - Generates 9 questions (1 introduction + 8 regular) and stores in QuestionPool schema
  - **Does NOT store questions in Interview schema**
  - Returns interview details with `questionsGenerating: true`

### 2. Get First Question API
- **Endpoint**: `GET /api/interviews/:id/first-question`
- **Action**:
  - Retrieves introduction question (index 0) from QuestionPool
  - Stores ONLY this question in Interview schema with `questionType: "pool"`
  - Marks question as `isAsked: true` in QuestionPool
  - Returns the introduction question to frontend

### 3. Submit Answer Flow (Alternating Pattern)

#### When submitting answer to a Pool Question:
1. Save answer in Interview schema
2. Mark question as completed in QuestionPool
3. Generate AI-powered follow-up question based on the answer
4. Store follow-up question in Interview schema with `questionType: "followup"`
5. Return follow-up question to frontend

#### When submitting answer to a Follow-up Question:
1. Save answer in Interview schema
2. Calculate next pool question index: `Math.floor(interview.questions.length / 2)`
3. Retrieve next question from QuestionPool
4. Store pool question in Interview schema with `questionType: "pool"`
5. Mark question as `isAsked: true` in QuestionPool
6. Return pool question to frontend

## Question Sequence Example

| Question # | Type | Source | Description |
|------------|------|--------|-------------|
| 1 | Pool | QuestionPool[0] | Introduction question |
| 2 | Follow-up | AI Generated | Based on introduction answer |
| 3 | Pool | QuestionPool[1] | First technical question |
| 4 | Follow-up | AI Generated | Based on first technical answer |
| 5 | Pool | QuestionPool[2] | Second technical question |
| 6 | Follow-up | AI Generated | Based on second technical answer |
| ... | ... | ... | ... |
| 17 | Pool | QuestionPool[8] | Eighth technical question |
| 18 | Follow-up | AI Generated | Based on eighth technical answer |

## Database Schema Changes

### Interview Schema
- Added `questionType` field to questions array:
  - `"pool"`: Question from pre-generated pool
  - `"followup"`: AI-generated follow-up question

### QuestionPool Schema
- Added `isAsked` field: Tracks if question has been asked
- Added `askedAt` field: Timestamp when question was asked

## Key Benefits

### 1. **Progressive Question Storage**
- Questions stored in Interview schema only when asked
- Enables accurate tracking of interview progress
- Better analytics on completion rates

### 2. **Intelligent Follow-up Questions**
- AI-powered contextual questions based on candidate answers
- Deeper evaluation of candidate knowledge
- Natural conversation flow

### 3. **Enhanced Analytics**
- Track exactly how many questions each candidate answered
- Differentiate between pool questions and follow-ups
- Analyze which questions generate better insights

### 4. **Scalable Design**
- Total of 18 questions provides comprehensive evaluation
- Alternating pattern ensures balanced assessment
- Flexible to adjust total question count if needed

## API Responses

### Get First Question Response
```json
{
  "success": true,
  "message": "First question retrieved successfully",
  "data": {
    "question": {
      "questionId": "1704201234567",
      "question": "Hello! Could you please introduce yourself...",
      "category": "Introduction",
      "difficulty": "easy",
      "questionType": "pool"
    },
    "interviewId": "interview_id",
    "questionNumber": 1
  }
}
```

### Submit Answer Response
```json
{
  "success": true,
  "message": "Answer submitted successfully",
  "data": {
    "questionId": "submitted_question_id",
    "answer": "candidate_answer",
    "analysis": { /* answer analysis */ },
    "nextQuestion": {
      "questionId": "followup_1704201234567_123",
      "question": "Can you elaborate on that experience...",
      "category": "Follow-up",
      "difficulty": "medium",
      "questionType": "followup"
    },
    "questionNumber": 2
  }
}
```

## Implementation Files Modified

1. **`src/models/Interview.js`**: Added `questionType` field
2. **`src/models/QuestionPool.js`**: Added `isAsked` and `askedAt` fields
3. **`src/services/questionManagementService/getFirstQuestion.js`**: Updated to mark questions as asked
4. **`src/controllers/interviewController/submitAnswer.js`**: Complete rewrite for alternating logic
5. **`src/services/analysisService/generateFollowUpQuestion.js`**: Enhanced follow-up generation
6. **`src/services/questionGenerationService/generateCompleteQuestionSet.js`**: Removed auto-storage of questions

## Testing the Flow

1. Start interview → Should generate question pool only
2. Get first question → Should get introduction from pool
3. Submit introduction answer → Should return AI follow-up
4. Submit follow-up answer → Should return next pool question
5. Continue pattern → Should alternate between pool and follow-up
6. After 18 questions → Interview complete

This implementation creates a professional, comprehensive interview platform with intelligent question flow and detailed tracking capabilities.