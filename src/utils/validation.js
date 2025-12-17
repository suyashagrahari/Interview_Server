/**
 * Validation utilities for interview-related operations
 */

/**
 * Validate interview creation request
 * @param {Object} reqBody - Request body containing interview data
 * @param {String} interviewSource - 'resume' or 'jobDescription'
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateInterviewRequest = (reqBody, interviewSource = "resume") => {
  const {
    resumeId,
    jobDescriptionId,
    interviewType,
    level,
    difficultyLevel,
    experienceLevel,
    jobRole,
    interviewerId,
    interviewer,
  } = reqBody;

  const errors = [];

  // Validate source-specific required field
  if (interviewSource === "resume") {
    if (!resumeId) {
      errors.push("resumeId is required for resume-based interviews");
    }
  } else if (interviewSource === "jobDescription") {
    if (!jobDescriptionId) {
      errors.push(
        "jobDescriptionId is required for job description-based interviews"
      );
    }
  }

  // Validate common required fields
  if (!interviewType) {
    errors.push("interviewType is required");
  } else if (!["technical", "behavioral"].includes(interviewType)) {
    errors.push("interviewType must be either 'technical' or 'behavioral'");
  }

  // Validate level or experienceLevel (at least one should be present)
  if (!level && !experienceLevel) {
    errors.push("Either level or experienceLevel is required");
  }

  if (level && !["0-2", "3-4", "5-6", "7-8", "9-10"].includes(level)) {
    errors.push("level must be one of: '0-2', '3-4', '5-6', '7-8', '9-10'");
  }

  if (!difficultyLevel) {
    errors.push("difficultyLevel is required");
  } else if (
    !["beginner", "intermediate", "expert"].includes(difficultyLevel)
  ) {
    errors.push(
      "difficultyLevel must be 'beginner', 'intermediate', or 'expert'"
    );
  }

  // jobRole is required for resume interviews but optional for job description interviews
  if (interviewSource === "resume") {
    if (!jobRole || jobRole.trim() === "") {
      errors.push("jobRole is required and cannot be empty");
    }
  }

  if (!interviewerId) {
    errors.push("interviewerId is required");
  }

  // Validate interviewer details
  if (!interviewer) {
    errors.push("interviewer object is required");
  } else {
    if (!interviewer.name || interviewer.name.trim() === "") {
      errors.push("interviewer.name is required and cannot be empty");
    }
    if (!interviewer.experience || interviewer.experience.trim() === "") {
      errors.push("interviewer.experience is required and cannot be empty");
    }
    if (!interviewer.bio || interviewer.bio.trim() === "") {
      errors.push("interviewer.bio is required and cannot be empty");
    }
  }

  // Validate number of interviewers
  if (interviewer?.numberOfInterviewers !== undefined) {
    const numInterviewers = parseInt(interviewer.numberOfInterviewers);
    if (isNaN(numInterviewers) || numInterviewers < 1 || numInterviewers > 10) {
      errors.push("interviewer.numberOfInterviewers must be between 1 and 10");
    }
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
