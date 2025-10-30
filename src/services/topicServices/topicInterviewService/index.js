/**
 * Topic Interview Service
 * Manages interview lifecycle for topic-based interviews
 * - Create, read, update, delete interviews
 * - Check active interviews
 * - End interviews with analysis
 * - Support both resume and job description source types
 */

const createInterview = require("./createInterview");
const checkActiveInterview = require("./checkActiveInterview");
const getInterviewById = require("./getInterviewById");
const getUserInterviews = require("./getUserInterviews");
const updateInterviewStatus = require("./updateInterviewStatus");
const deleteInterview = require("./deleteInterview");
const endInterview = require("./endInterview");

// Create a class-like structure for topic interview management
class TopicInterviewService {
  static async createInterview(userId, interviewData) {
    return await createInterview(userId, interviewData);
  }

  static async checkActiveInterview(userId) {
    return await checkActiveInterview(userId);
  }

  static async getInterviewById(interviewId, userId) {
    return await getInterviewById(interviewId, userId);
  }

  static async getUserInterviews(userId, options) {
    return await getUserInterviews(userId, options);
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
module.exports = TopicInterviewService;
module.exports.createInterview = createInterview;
module.exports.checkActiveInterview = checkActiveInterview;
module.exports.getInterviewById = getInterviewById;
module.exports.getUserInterviews = getUserInterviews;
module.exports.updateInterviewStatus = updateInterviewStatus;
module.exports.deleteInterview = deleteInterview;
module.exports.endInterview = endInterview;
