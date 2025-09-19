const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate a new question from scratch
 * @param {Object} interview - Interview object
 * @param {number} questionIndex - Question index
 * @returns {Object} Generated question
 */
const generateNewQuestion = async (interview, questionIndex) => {
  const prompt = `Generate a new interview question.

INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Interview Type: ${interview.interviewType}
- Experience Level: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}
- Resume: ${interview.resumeId.resumeText.substring(0, 1000)}...

Generate a relevant question that:
1. Is appropriate for the experience level and job role
2. Tests technical or behavioral skills based on interview type
3. Is different from previous questions
4. Has appropriate difficulty level

Respond with JSON format:
{
  "questionId": "q${questionIndex + 1}",
  "question": "The new question",
  "category": "Technical Skills",
  "difficulty": "medium",
  "expectedAnswer": "Expected answer format"
}`;

  try {
    const response = await chatGPTService.generateResponse(prompt);
    const questionData = JSON.parse(response);

    return {
      questionId: questionData.questionId,
      question: questionData.question,
      category: questionData.category,
      difficulty: questionData.difficulty,
      expectedAnswer: questionData.expectedAnswer,
    };
  } catch (error) {
    logger.error("Error generating new question:", error);
    throw error;
  }
};

module.exports = generateNewQuestion;



