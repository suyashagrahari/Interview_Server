/**
 * Job Description Interview Service
 * Manages interview lifecycle for job-description-based interviews
 * - Validate interview requests
 * - Check active interviews
 * - Verify job description ownership
 * - Create, read, update, delete interviews
 * - End interviews with analysis
 */

const endInterview = require("./endInterview");

// Create a class-like structure for job description interview management
class JobDescriptionInterviewService {
  static async endInterview(interviewId, userId) {
    return await endInterview(interviewId, userId);
  }
}

// Export both the class and individual functions
module.exports = JobDescriptionInterviewService;
module.exports.endInterview = endInterview;


