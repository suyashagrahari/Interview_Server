/**
 * Topic Analysis Service
 * Handles analysis and question generation for topic-based interviews
 */

const generateIntroductionQuestion = require("./generateIntroductionQuestion");

class TopicAnalysisService {
  static async generateIntroductionQuestion(interview, candidateName, topicName) {
    return await generateIntroductionQuestion(interview, candidateName, topicName);
  }
}

module.exports = TopicAnalysisService;
module.exports.generateIntroductionQuestion = generateIntroductionQuestion;
