// Main ChatGPT service - exports all modular functions
const generateInterviewQuestions = require("./generateInterviewQuestions");
const buildPrompt = require("./buildPrompt");
const generateResponse = require("./generateResponse");
const testConnection = require("./testConnection");
const {
  getDifficultyDescription,
  getLevelDescription,
  getInterviewTypeDescription,
} = require("./promptHelpers");

// Create a class-like structure for backward compatibility
class ChatGPTService {
  constructor() {
    this.generateInterviewQuestions = generateInterviewQuestions;
    this.buildPrompt = buildPrompt;
    this.generateResponse = generateResponse;
    this.testConnection = testConnection;
    this.getDifficultyDescription = getDifficultyDescription;
    this.getLevelDescription = getLevelDescription;
    this.getInterviewTypeDescription = getInterviewTypeDescription;
  }

  async generateInterviewQuestions(params) {
    return await generateInterviewQuestions(params);
  }

  buildPrompt(params) {
    return buildPrompt(params);
  }

  async generateResponse(prompt, maxTokens, temperature) {
    return await generateResponse(prompt, maxTokens, temperature);
  }

  async testConnection() {
    return await testConnection();
  }

  getDifficultyDescription(level) {
    return getDifficultyDescription(level);
  }

  getLevelDescription(level) {
    return getLevelDescription(level);
  }

  getInterviewTypeDescription(type) {
    return getInterviewTypeDescription(type);
  }
}

// Export both the class instance and individual functions
module.exports = new ChatGPTService();
module.exports.generateInterviewQuestions = generateInterviewQuestions;
module.exports.buildPrompt = buildPrompt;
module.exports.generateResponse = generateResponse;
module.exports.testConnection = testConnection;
module.exports.getDifficultyDescription = getDifficultyDescription;
module.exports.getLevelDescription = getLevelDescription;
module.exports.getInterviewTypeDescription = getInterviewTypeDescription;

