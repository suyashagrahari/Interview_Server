/**
 * Validation utilities for interview-related operations
 */

/**
 * Validate interview creation request
 * @param {Object} reqBody - Request body containing interview data
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateInterviewRequest = (reqBody) => {
  const {
    resumeId,
    interviewType,
    level,
    difficultyLevel,
    jobRole,
    interviewerId,
    interviewer,
  } = reqBody;

  const errors = [];

  // Validate required fields
  if (
    !resumeId ||
    !interviewType ||
    !level ||
    !difficultyLevel ||
    !jobRole ||
    !interviewerId
  ) {
    errors.push(
      "Missing required fields: resumeId, interviewType, level, difficultyLevel, jobRole, interviewerId"
    );
  }

  // Validate interviewer details
  if (
    !interviewer ||
    !interviewer.name ||
    !interviewer.experience ||
    !interviewer.bio
  ) {
    errors.push(
      "Missing required interviewer details: name, experience, and bio are required"
    );
  }

  // Validate number of interviewers
  if (
    interviewer?.numberOfInterviewers &&
    (interviewer.numberOfInterviewers < 1 ||
      interviewer.numberOfInterviewers > 10)
  ) {
    errors.push("Number of interviewers must be between 1 and 10");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate answer submission request
 * @param {Object} reqBody - Request body containing answer data
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateAnswerSubmission = (reqBody) => {
  const { answer, questionId } = reqBody;
  const errors = [];

  if (!answer || answer.trim() === "") {
    errors.push("Answer is required and cannot be empty");
  }

  if (!questionId) {
    errors.push("Question ID is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate question addition request
 * @param {Object} reqBody - Request body containing question data
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateQuestionAddition = (reqBody) => {
  const { questionId, question, category } = reqBody;
  const errors = [];

  if (!questionId) {
    errors.push("Question ID is required");
  }

  if (!question || question.trim() === "") {
    errors.push("Question is required and cannot be empty");
  }

  if (!category) {
    errors.push("Category is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate status update request
 * @param {string} status - Status to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateStatusUpdate = (status) => {
  const validStatuses = [
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
    "paused",
  ];

  const errors = [];

  if (!status) {
    errors.push("Status is required");
  } else if (!validStatuses.includes(status)) {
    errors.push(
      `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    validStatuses,
  };
};

/**
 * Validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validation result with isValid flag and normalized parameters
 */
const validatePaginationParams = (query) => {
  const { page = 1, limit = 10 } = query;
  const errors = [];

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    errors.push("Page must be a positive integer");
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push("Limit must be between 1 and 100");
  }

  return {
    isValid: errors.length === 0,
    errors,
    page: pageNum,
    limit: limitNum,
  };
};

module.exports = {
  validateInterviewRequest,
  validateAnswerSubmission,
  validateQuestionAddition,
  validateStatusUpdate,
  validatePaginationParams,
};
