/**
 * Validate interview creation request
 * @param {Object} reqBody - Request body data
 * @returns {Object} Validation result
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

module.exports = validateInterviewRequest;

