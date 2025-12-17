/**
 * Job Description Analysis Service
 * Handles all analysis-related operations for job-description-based interviews
 * - Answer analysis and scoring
 * - Follow-up question generation
 * - Introduction question generation
 * - Question personalization and rephrasing
 */

const analyzeAnswer = require("./analyzeAnswer");
const generateFollowUpQuestion = require("./generateFollowUpQuestion");
const generateIntroductionQuestion = require("./generateIntroductionQuestion");
const rephraseQuestionWithPersonalization = require("./rephraseQuestionWithPersonalization");
const rephraseQuestionWithWarning = require("./rephraseQuestionWithWarning");

module.exports = {
  analyzeAnswer,
  generateFollowUpQuestion,
  generateIntroductionQuestion,
  rephraseQuestionWithPersonalization,
  rephraseQuestionWithWarning,
};
