// Main question controller - exports all modular functions
const generateQuestions = require("./generateQuestions");
const getQuestions = require("./getQuestions");
const getQuestionById = require("./getQuestionById");
const getUserQuestionPools = require("./getUserQuestionPools");
const testChatGPTConnection = require("./testChatGPTConnection");

module.exports = {
  generateQuestions,
  getQuestions,
  getQuestionById,
  getUserQuestionPools,
  testChatGPTConnection,
};

