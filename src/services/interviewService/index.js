// Main interview service - exports all modular functions
const validateInterviewRequest = require("./validateInterviewRequest");
const checkActiveInterview = require("./checkActiveInterview");
const verifyResumeOwnership = require("./verifyResumeOwnership");
const createInterview = require("./createInterview");
const getUserInterviews = require("./getUserInterviews");
const getInterviewById = require("./getInterviewById");
const updateInterviewStatus = require("./updateInterviewStatus");
const deleteInterview = require("./deleteInterview");
const endInterview = require("./endInterview");

// Create a class-like structure for backward compatibility
class InterviewService {
  static validateInterviewRequest(reqBody) {
    return validateInterviewRequest(reqBody);
  }

  static async checkActiveInterview(userId) {
    return await checkActiveInterview(userId);
  }

  static async verifyResumeOwnership(resumeId, userId) {
    return await verifyResumeOwnership(resumeId, userId);
  }

  static async createInterview(userId, interviewData) {
    return await createInterview(userId, interviewData);
  }

  static async getUserInterviews(userId, options) {
    return await getUserInterviews(userId, options);
  }

  static async getInterviewById(interviewId, userId) {
    return await getInterviewById(interviewId, userId);
  }

  static async updateInterviewStatus(interviewId, userId, status) {
    return await updateInterviewStatus(interviewId, userId, status);
  }

  static async deleteInterview(interviewId, userId) {
    return await deleteInterview(interviewId, userId);
  }

  static async endInterview(interviewId, userId) {
    return await endInterview(interviewId, userId);
  }
}

// Export both the class and individual functions
module.exports = InterviewService;
module.exports.validateInterviewRequest = validateInterviewRequest;
module.exports.checkActiveInterview = checkActiveInterview;
module.exports.verifyResumeOwnership = verifyResumeOwnership;
module.exports.createInterview = createInterview;
module.exports.getUserInterviews = getUserInterviews;
module.exports.getInterviewById = getInterviewById;
module.exports.updateInterviewStatus = updateInterviewStatus;
module.exports.deleteInterview = deleteInterview;
module.exports.endInterview = endInterview;

