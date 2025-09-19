// Main question management service - exports all modular functions
const addQuestionToInterview = require("./addQuestionToInterview");
const updateAnswer = require("./updateAnswer");
const updateAnswerAnalysis = require("./updateAnswerAnalysis");
const getFirstQuestion = require("./getFirstQuestion");
const getNextQuestionFromPool = require("./getNextQuestionFromPool");
const markQuestionCompleted = require("./markQuestionCompleted");

// Create a class-like structure for backward compatibility
class QuestionManagementService {
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
module.exports = QuestionManagementService;
module.exports.addQuestionToInterview = addQuestionToInterview;
module.exports.updateAnswer = updateAnswer;
module.exports.updateAnswerAnalysis = updateAnswerAnalysis;
module.exports.getFirstQuestion = getFirstQuestion;
module.exports.getNextQuestionFromPool = getNextQuestionFromPool;
module.exports.markQuestionCompleted = markQuestionCompleted;

