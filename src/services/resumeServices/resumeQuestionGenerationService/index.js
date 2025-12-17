/**
 * Resume Question Generation Service
 * Handles all question generation operations for resume-based interviews
 * - Generate complete question sets from resume
 * - Generate introduction questions
 * - Generate follow-up questions
 * - Manage question pools for resume interviews
 */

const generateInterviewQuestions = require("./generateInterviewQuestions");
const generateIntroductionQuestion = require("./generateIntroductionQuestion");
const generateCompleteQuestionSet = require("./generateCompleteQuestionSet");
const generateFollowUpQuestion = require("./generateFollowUpQuestion");
const generateNewQuestion = require("./generateNewQuestion");
const getNextQuestionFromPool = require("./getNextQuestionFromPool");
const storeQuestionInPool = require("./storeQuestionInPool");
const getQuestionsForInterview = require("./getQuestionsForInterview");

// Create a class-like structure for resume interview questions
class ResumeQuestionGenerationService {
  static async generateInterviewQuestions(interviewId, userId) {
    return await generateInterviewQuestions(interviewId, userId);
  }

  static async generateIntroductionQuestion(interview, candidateName) {
    return await generateIntroductionQuestion(interview, candidateName);
  }

  static async generateCompleteQuestionSet(interviewId, userId) {
    return await generateCompleteQuestionSet(interviewId, userId);
  }

  static async generateFollowUpQuestion(
    interview,
    previousQuestion,
    answer,
    questionIndex
  ) {
    return await generateFollowUpQuestion(
      interview,
      previousQuestion,
      answer,
      questionIndex
    );
  }

  static async generateNewQuestion(interview, questionIndex) {
    return await generateNewQuestion(interview, questionIndex);
  }

  static async getNextQuestionFromPool(interview, currentQuestionNumber) {
    return await getNextQuestionFromPool(interview, currentQuestionNumber);
  }

  static async storeQuestionInPool(
    interviewId,
    resumeId,
    userId,
    question,
    interview,
    questionIndex
  ) {
    return await storeQuestionInPool(
      interviewId,
      resumeId,
      userId,
      question,
      interview,
      questionIndex
    );
  }

  static async getQuestionsForInterview(interviewId, userId) {
    return await getQuestionsForInterview(interviewId, userId);
  }
}

// Export both the class and individual functions
module.exports = ResumeQuestionGenerationService;
module.exports.generateInterviewQuestions = generateInterviewQuestions;
module.exports.generateIntroductionQuestion = generateIntroductionQuestion;
module.exports.generateCompleteQuestionSet = generateCompleteQuestionSet;
module.exports.generateFollowUpQuestion = generateFollowUpQuestion;
module.exports.generateNewQuestion = generateNewQuestion;
module.exports.getNextQuestionFromPool = getNextQuestionFromPool;
module.exports.storeQuestionInPool = storeQuestionInPool;
module.exports.getQuestionsForInterview = getQuestionsForInterview;
