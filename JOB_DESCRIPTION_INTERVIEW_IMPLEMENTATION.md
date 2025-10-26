# Job Description Interview Implementation Guide

## Overview
This document describes the complete backend implementation for creating JobDescription interviews based on a job description document.

## API Endpoint

### POST `/api/job-description-interview/start`

**Description**: Create a new job description interview session with proper validation and question generation.

**Authentication**: Required (Bearer Token)

**Request Payload Structure**:
```json
{
  "jobDescriptionId": "68fbcf2263a98a269db2cbef",
  "interviewType": "technical",
  "difficultyLevel": "intermediate",
  "experienceLevel": "3-4",
  "interviewerId": "68c7151f3c4679a31bc864a6",
  "interviewer": {
    "name": "Sarah Chen",
    "numberOfInterviewers": 1,
    "experience": "8 years",
    "bio": "Senior software engineer with 8+ years of experience in full-stack development...",
    "introduction": "Hello! I'm Sarah, and I'll be conducting your technical interview today..."
  },
  "jobRole": "Full Stack Developer",
  "companyName": "Tech Corp",
  "skills": ["React", "Node.js", "MongoDB"],
  "additionalNotes": "Focus on system design"
}
```

## Required Fields

### Mandatory Fields:
1. **jobDescriptionId** (String, MongoDB ObjectId)
   - The ID of the job description document
   - Must be a valid ObjectId format
   - Must exist in the database and belong to the authenticated user

2. **interviewType** (String, enum: ['technical', 'behavioral'])
   - Type of interview to conduct

3. **difficultyLevel** (String, enum: ['beginner', 'intermediate', 'expert'])
   - Difficulty level of the interview questions

4. **experienceLevel** (String, enum: ['0-2', '3-4', '5-6', '7-8', '9-10'])
   - Years of experience required for the role

5. **interviewerId** (String)
   - Unique identifier for the interviewer

6. **interviewer** (Object)
   - **name** (String, required): Interviewer's full name
   - **experience** (String, required): Interviewer's years of experience
   - **bio** (String, required): Interviewer's background and expertise
   - **numberOfInterviewers** (Number, optional, default: 1): Number of interviewers (1-10)
   - **introduction** (String, optional): Personalized introduction message

### Optional Fields:
- **jobRole** (String): Job title (extracted from JD name if not provided)
- **companyName** (String): Company name
- **skills** (Array<String>): List of required skills
- **additionalNotes** (String): Any additional instructions
- **scheduled** (Boolean): Whether the interview is scheduled
- **scheduledDate** (Date): Scheduled date for the interview
- **scheduledTime** (String): Scheduled time for the interview

## Validation Rules

### JobDescriptionId Validation:
```javascript
// 1. Format validation
mongoose.Types.ObjectId.isValid(jobDescriptionId)

// 2. Existence check
JobDescription.findOne({
  _id: jobDescriptionId,
  userId: authenticatedUserId,
  isActive: true
})
```

### Interview Type Validation:
- Must be either 'technical' or 'behavioral'

### Difficulty Level Validation:
- Must be one of: 'beginner', 'intermediate', 'expert'

### Experience Level Validation:
- Must be one of: '0-2', '3-4', '5-6', '7-8', '9-10'

### Interviewer Validation:
- `name`, `experience`, and `bio` are required
- `numberOfInterviewers` must be between 1 and 10
- All string fields must not be empty

## Implementation Flow

### 1. Request Validation
```javascript
// File: src/utils/validation.js
const validation = validateInterviewRequest(req.body, 'jobDescription');
if (!validation.isValid) {
  return sendValidationError(res, validation.errors);
}
```

### 2. ObjectId Format Check
```javascript
// File: src/controllers/jobDescriptionInterviewController/startInterview.js
if (!mongoose.Types.ObjectId.isValid(req.body.jobDescriptionId)) {
  return sendValidationError(res, ["Invalid jobDescriptionId format"]);
}
```

### 3. Active Interview Check
```javascript
const activeInterview = await JobDescriptionInterview.findOne({
  candidateId: req.user.id,
  status: { $in: ["scheduled", "in_progress"] },
  isActive: true,
});

if (activeInterview) {
  return sendConflictError(res, "You already have an active interview...");
}
```

### 4. Job Description Verification
```javascript
const jobDescription = await JobDescription.findOne({
  _id: req.body.jobDescriptionId,
  userId: req.user.id,
  isActive: true,
});

if (!jobDescription) {
  return sendNotFoundError(res, "Job description not found or access denied");
}
```

### 5. Interview Creation
```javascript
const interviewData = {
  candidateId: req.user.id,
  jobDescriptionId: req.body.jobDescriptionId,
  interviewType: req.body.interviewType,
  level: req.body.experienceLevel,
  difficultyLevel: req.body.difficultyLevel,
  jobRole: req.body.jobRole || jobDescription.jdName,
  interviewerId: req.body.interviewerId,
  interviewer: { /* interviewer details */ },
  status: "scheduled",
  createdBy: req.user.id,
  // ... other fields
};

const interview = new JobDescriptionInterview(interviewData);
await interview.save();
```

### 6. Question Generation (Asynchronous)
```javascript
JobDescriptionQuestionGenerationService.generateCompleteQuestionSet(
  interview._id,
  req.user.id,
  jobDescription
);
```

The question generation happens in the background and includes:
- 1 introduction question personalized to the candidate
- 8 technical/behavioral questions based on the job description content

## Question Generation Process

### Service: `jobDescriptionQuestionGenerationService`

**Location**: `src/services/jobDescriptionQuestionGenerationService/`

**Method**: `generateCompleteQuestionSet(interviewId, userId, jobDescription)`

**Steps**:

1. **Fetch Interview Details**
   - Retrieve interview configuration
   - Get candidate information

2. **Generate Introduction Question**
   ```javascript
   {
     questionId: `intro-${timestamp}${random}`,
     question: `Hello ${candidateName}! I'm your interviewer for the ${jobRole} position...`,
     category: "Introduction",
     difficulty: "easy",
     expectedAnswer: "Brief overview of background and interest..."
   }
   ```

3. **Generate Regular Questions**
   - Uses ChatGPT API with job description text
   - Generates 8 questions based on:
     - JD requirements
     - Interview type (technical/behavioral)
     - Experience level
     - Difficulty level
   - Each question includes:
     - Unique questionId
     - Question text
     - Category
     - Expected answer
     - Relevant keywords

4. **Create Question Pool**
   ```javascript
   new JobDescriptionInterviewQuestionPool({
     jobDescriptionId,
     interviewId,
     userId,
     questions: [introductionQuestion, ...regularQuestions],
     totalTokensUsed
   });
   ```

## Response Format

### Success Response (201 Created):
```json
{
  "success": true,
  "message": "Job Description Interview started successfully",
  "data": {
    "interviewId": "67fbcf2263a98a269db2cbef",
    "status": "scheduled",
    "startedAt": null,
    "scheduledDate": null,
    "scheduledTime": "",
    "jdName": "Senior Full Stack Developer",
    "jobRole": "Full Stack Developer",
    "interviewType": "technical",
    "level": "3-4",
    "difficultyLevel": "intermediate",
    "interviewer": {
      "name": "Sarah Chen",
      "numberOfInterviewers": 1,
      "experience": "8 years",
      "bio": "Senior software engineer..."
    },
    "questionsGenerating": true
  }
}
```

### Error Responses:

**401 Unauthorized**:
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**400 Bad Request** (Validation Error):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "jobDescriptionId is required for job description-based interviews",
    "interviewType is required",
    "interviewer.name is required and cannot be empty"
  ]
}
```

**404 Not Found**:
```json
{
  "success": false,
  "message": "Job description not found or access denied"
}
```

**409 Conflict**:
```json
{
  "success": false,
  "message": "You already have an active interview session...",
  "data": {
    "interviewId": "existing_interview_id",
    "status": "in_progress"
  }
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "message": "Internal server error while starting interview"
}
```

## Database Models

### JobDescriptionInterview Model
**Location**: `src/models/JobDescriptionInterview.js`

**Key Fields**:
- `candidateId`: Reference to User
- `jobDescriptionId`: Reference to JobDescription
- `interviewType`: technical/behavioral
- `level`: Experience level
- `difficultyLevel`: beginner/intermediate/expert
- `jobRole`: Job title
- `interviewerId`: Interviewer identifier
- `interviewer`: Nested object with interviewer details
- `status`: scheduled/in_progress/completed/cancelled/paused
- `questions`: Array of interview questions with answers
- `proctoringData`: Tracking of violations
- `overallAnalysis`: Interview results and feedback

### JobDescriptionInterviewQuestionPool Model
**Location**: `src/models/JobDescriptionInterviewQuestionPool.js`

**Purpose**: Stores the complete set of generated questions for the interview

## Testing the Implementation

### Sample cURL Request:
```bash
curl -X POST http://localhost:5000/api/job-description-interview/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jobDescriptionId": "68fbcf2263a98a269db2cbef",
    "interviewType": "technical",
    "difficultyLevel": "intermediate",
    "experienceLevel": "3-4",
    "interviewerId": "68c7151f3c4679a31bc864a6",
    "interviewer": {
      "name": "Sarah Chen",
      "numberOfInterviewers": 1,
      "experience": "8 years",
      "bio": "Senior software engineer with 8+ years of experience",
      "introduction": "Hello! Im Sarah..."
    },
    "jobRole": "Full Stack Developer"
  }'
```

### Postman Collection:
1. Create a POST request to `/api/job-description-interview/start`
2. Add Authorization header with Bearer token
3. Use the sample payload above
4. Expected response: 201 Created with interview details

## Files Modified/Created

### Modified Files:
1. **src/utils/validation.js**
   - Updated `validateInterviewRequest` to support both resume and job description interviews
   - Added `interviewSource` parameter ('resume' or 'jobDescription')
   - Enhanced validation for all required fields

2. **src/controllers/jobDescriptionInterviewController/startInterview.js**
   - Added mongoose ObjectId validation
   - Updated to use new validation signature
   - Improved data mapping for experienceLevel
   - Enhanced logging

### Existing Files (Already Implemented):
1. **src/services/jobDescriptionQuestionGenerationService/**
   - `index.js`: Service exports
   - `generateCompleteQuestionSet.js`: Question generation logic

2. **src/services/chatgptService/**
   - `generateInterviewQuestionsFromJD.js`: ChatGPT integration for JD-based questions

3. **src/models/**
   - `JobDescriptionInterview.js`: Interview schema
   - `JobDescriptionInterviewQuestionPool.js`: Question pool schema
   - `JobDescription.js`: Job description schema

4. **src/routes/jobDescriptionInterview.js**
   - Routes configuration

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access their own job descriptions
3. **Validation**: Comprehensive input validation prevents injection attacks
4. **ObjectId Validation**: Prevents MongoDB casting errors
5. **Active Interview Check**: Prevents multiple concurrent interviews
6. **Rate Limiting**: Should be implemented at API gateway level

## Performance Considerations

1. **Async Question Generation**: Questions are generated in the background
2. **Database Indexes**: Proper indexing on candidateId, status, and jobDescriptionId
3. **Lean Queries**: Use `.select()` to fetch only required fields
4. **Connection Pooling**: MongoDB connection pooling for scalability

## Monitoring and Logging

All operations are logged using the centralized logger:
```javascript
logger.info(`Job Description Interview created: ${interview._id}`);
logger.error("Error starting JD interview:", error);
```

**Log Levels**:
- INFO: Successful operations
- WARN: Non-critical issues
- ERROR: Failures and exceptions

## Next Steps

1. **Frontend Integration**: Connect the UI to this API endpoint
2. **WebSocket Integration**: Real-time interview progress updates
3. **Email Notifications**: Send interview invitations
4. **Analytics**: Track interview performance metrics
5. **Export Features**: Generate interview reports

## Support

For issues or questions:
- Check logs in: `/var/log/interview-server/`
- Review API documentation
- Contact the development team

---

**Last Updated**: 2025-10-25
**Version**: 1.0.0
