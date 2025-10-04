// Main analysis service - exports all modular functions
const analyzeAnswer = require("./analyzeAnswer");
const generateFollowUpQuestion = require("./generateFollowUpQuestion");
const generateIntroductionQuestion = require("./generateIntroductionQuestion");
const rephraseQuestionWithWarning = require("./rephraseQuestionWithWarning");
const rephraseQuestionWithPersonalization = require("./rephraseQuestionWithPersonalization");

// Create a class-like structure for backward compatibility
class AnalysisService {
  static async analyzeAnswer(interview, question, answer, proctoringData) {
    return await analyzeAnswer(interview, question, answer, proctoringData);
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

  static async generateIntroductionQuestion(interview, candidateName) {
    return await generateIntroductionQuestion(interview, candidateName);
  }

  static async rephraseQuestionWithWarning(originalQuestion, sentiment) {
    return await rephraseQuestionWithWarning(originalQuestion, sentiment);
  }

  static async rephraseQuestionWithPersonalization(
    originalQuestion,
    previousAnswer,
    sentiment
  ) {
    return await rephraseQuestionWithPersonalization(
      originalQuestion,
      previousAnswer,
      sentiment
    );
  }
}

// Export both the class and individual functions
module.exports = AnalysisService;
module.exports.analyzeAnswer = analyzeAnswer;
module.exports.generateFollowUpQuestion = generateFollowUpQuestion;
module.exports.generateIntroductionQuestion = generateIntroductionQuestion;
module.exports.rephraseQuestionWithWarning = rephraseQuestionWithWarning;
module.exports.rephraseQuestionWithPersonalization =
  rephraseQuestionWithPersonalization;
