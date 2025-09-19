const { body } = require("express-validator");
const { handleValidationErrors } = require("./validation");

/**
 * Validation rules for starting interview
 */
const validateStartInterview = [
  body("resumeId")
    .notEmpty()
    .withMessage("Resume ID is required")
    .isMongoId()
    .withMessage("Invalid resume ID format"),

  body("interviewType")
    .notEmpty()
    .withMessage("Interview type is required")
    .isIn(["technical", "behavioral"])
    .withMessage("Interview type must be either 'technical' or 'behavioral'"),

  body("level")
    .notEmpty()
    .withMessage("Experience level is required")
    .isIn(["0-2", "3-4", "5-6", "7-8", "9-10"])
    .withMessage("Invalid experience level"),

  body("difficultyLevel")
    .notEmpty()
    .withMessage("Difficulty level is required")
    .isIn(["beginner", "intermediate", "expert"])
    .withMessage(
      "Difficulty level must be 'beginner', 'intermediate', or 'expert'"
    ),

  body("jobRole")
    .notEmpty()
    .withMessage("Job role is required")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Job role must be between 1 and 100 characters"),

  body("interviewerId")
    .notEmpty()
    .withMessage("Interviewer ID is required")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Interviewer ID must be between 1 and 50 characters"),

  body("companyName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Company name cannot be more than 100 characters"),

  body("experienceLevel")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Experience level cannot be more than 50 characters"),

  body("skills").optional().isArray().withMessage("Skills must be an array"),

  body("additionalNotes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Additional notes cannot be more than 1000 characters"),

  body("scheduled")
    .optional()
    .isBoolean()
    .withMessage("Scheduled must be a boolean"),

  body("scheduledDate")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be a valid ISO 8601 date"),

  body("scheduledTime")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Scheduled time cannot be more than 10 characters"),

  handleValidationErrors,
];

/**
 * Validation rules for updating interview status
 */
const validateUpdateStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["scheduled", "in_progress", "completed", "cancelled", "paused"])
    .withMessage("Invalid status"),

  handleValidationErrors,
];

/**
 * Validation rules for adding question
 */
const validateAddQuestion = [
  body("questionId")
    .notEmpty()
    .withMessage("Question ID is required")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Question ID must be between 1 and 50 characters"),

  body("question")
    .notEmpty()
    .withMessage("Question is required")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Question must be between 1 and 1000 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Category must be between 1 and 50 characters"),

  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard"])
    .withMessage("Difficulty must be 'easy', 'medium', or 'hard'"),

  body("expectedAnswer")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Expected answer cannot be more than 2000 characters"),

  handleValidationErrors,
];

/**
 * Validation rules for updating answer
 */
const validateUpdateAnswer = [
  body("answer")
    .notEmpty()
    .withMessage("Answer is required")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Answer must be between 1 and 5000 characters"),

  body("timeSpent")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Time spent must be a non-negative integer"),

  handleValidationErrors,
];

/**
 * Validation rules for answer analysis
 */
const validateAnswerAnalysis = [
  body("relevance")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Relevance must be between 0 and 10"),

  body("completeness")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Completeness must be between 0 and 10"),

  body("technicalAccuracy")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Technical accuracy must be between 0 and 10"),

  body("communication")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Communication must be between 0 and 10"),

  body("overallRating")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("Overall rating must be between 0 and 10"),

  body("feedback")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Feedback cannot be more than 1000 characters"),

  body("strengths")
    .optional()
    .isArray()
    .withMessage("Strengths must be an array"),

  body("areasForImprovement")
    .optional()
    .isArray()
    .withMessage("Areas for improvement must be an array"),

  handleValidationErrors,
];

/**
 * Validation rules for generating first question
 */
const validateGenerateFirstQuestion = [
  body("interviewerBio")
    .notEmpty()
    .withMessage("Interviewer bio is required")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Interviewer bio must be between 10 and 1000 characters"),

  handleValidationErrors,
];

/**
 * Validation rules for submitting answer
 */
const validateSubmitAnswer = [
  body("answer")
    .notEmpty()
    .withMessage("Answer is required")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Answer must be between 1 and 5000 characters"),

  body("timeSpent")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Time spent must be a non-negative integer"),

  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("Start time must be a valid ISO 8601 date"),

  body("endTime")
    .optional()
    .isISO8601()
    .withMessage("End time must be a valid ISO 8601 date"),

  body("tabSwitches")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Tab switches must be a non-negative integer"),

  body("copyPasteCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Copy paste count must be a non-negative integer"),

  body("faceDetection")
    .optional()
    .isBoolean()
    .withMessage("Face detection must be a boolean"),

  body("mobileDetection")
    .optional()
    .isBoolean()
    .withMessage("Mobile detection must be a boolean"),

  body("laptopDetection")
    .optional()
    .isBoolean()
    .withMessage("Laptop detection must be a boolean"),

  body("zoomIn")
    .optional()
    .isBoolean()
    .withMessage("Zoom in must be a boolean"),

  body("zoomOut")
    .optional()
    .isBoolean()
    .withMessage("Zoom out must be a boolean"),

  body("questionNumber")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Question number must be a positive integer"),

  handleValidationErrors,
];

module.exports = {
  validateStartInterview,
  validateUpdateStatus,
  validateAddQuestion,
  validateUpdateAnswer,
  validateAnswerAnalysis,
  validateGenerateFirstQuestion,
  validateSubmitAnswer,
};


