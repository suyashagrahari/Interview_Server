// Main interview controller - exports all modular functions
const startInterview = require("./startInterview");
const getUserInterviews = require("./getUserInterviews");
const getInterviewById = require("./getInterviewById");
const updateInterviewStatus = require("./updateInterviewStatus");
const addQuestion = require("./addQuestion");
const updateAnswer = require("./updateAnswer");
const updateAnswerAnalysis = require("./updateAnswerAnalysis");
const deleteInterview = require("./deleteInterview");
const getInterviewQuestions = require("./getInterviewQuestions");
const generateInterviewQuestions = require("./generateInterviewQuestions");
const testChatGPTConnection = require("./testChatGPTConnection");
const generateFirstQuestion = require("./generateFirstQuestion");
const submitAnswer = require("./submitAnswer");
const endInterview = require("./endInterview");
const testing = require("./testing");

module.exports = {
  startInterview,
  getUserInterviews,
  getInterviewById,
  updateInterviewStatus,
  addQuestion,
  updateAnswer,
  updateAnswerAnalysis,
  deleteInterview,
  getInterviewQuestions,
  generateInterviewQuestions,
  testChatGPTConnection,
  generateFirstQuestion,
  submitAnswer,
  endInterview,
  testing,
};
