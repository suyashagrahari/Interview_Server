/**
 * Resume Question Management Service
 * Manages question lifecycle for resume-based interviews
 * - Add questions to interviews
 * - Update answers and analysis
 * - Get first question
 * - Get next question from pool
 * - Mark questions as completed
 */

const addQuestionToInterview = require("./addQuestionToInterview");
const updateAnswer = require("./updateAnswer");
const updateAnswerAnalysis = require("./updateAnswerAnalysis");
const getFirstQuestion = require("./getFirstQuestion");
const getNextQuestionFromPool = require("./getNextQuestionFromPool");
const markQuestionCompleted = require("./markQuestionCompleted");

// Create a class-like structure for resume question management
class ResumeQuestionManagementService {
  static async addQuestionToInterview(interviewId, userId, questionData) {
    return await addQuestionToInterview(interviewId, userId, questionData);
  }

  static async updateAnswer(
    interviewId,
    userId,
    questionId,
    answer,
    timeSpent
  ) {
    return await updateAnswer(
      interviewId,
      userId,
      questionId,
      answer,
      timeSpent
    );
  }

  static async updateAnswerAnalysis(interviewId, userId, questionId, analysis) {
    return await updateAnswerAnalysis(
      interviewId,
      userId,
      questionId,
      analysis
    );
  }

  static async getFirstQuestion(interviewId, userId) {
    return await getFirstQuestion(interviewId, userId);
  }

  static async getNextQuestionFromPool(interview, currentQuestionNumber) {
    return await getNextQuestionFromPool(interview, currentQuestionNumber);
  }

  static async markQuestionCompleted(interviewId, userId, questionId) {
    return await markQuestionCompleted(interviewId, userId, questionId);
  }
}

// Export both the class and individual functions
module.exports = ResumeQuestionManagementService;
module.exports.addQuestionToInterview = addQuestionToInterview;
module.exports.updateAnswer = updateAnswer;
module.exports.updateAnswerAnalysis = updateAnswerAnalysis;
module.exports.getFirstQuestion = getFirstQuestion;
module.exports.getNextQuestionFromPool = getNextQuestionFromPool;
module.exports.markQuestionCompleted = markQuestionCompleted;



