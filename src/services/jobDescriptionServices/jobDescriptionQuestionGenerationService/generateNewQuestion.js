const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate a new question from scratch for job description interviews
 * @param {Object} interview - Interview object (with populated jobDescriptionId)
 * @param {number} questionIndex - Question index
 * @returns {Object} Generated question
 */
const generateNewQuestion = async (interview, questionIndex) => {
  // Get job description text instead of resume text
  const jobDescriptionText =
    interview.jobDescriptionId?.jdText?.substring(0, 1000) ||
    "No job description data available";
  const companyName = interview.companyName || "the company";

  const prompt = `Generate a new interview question for a job description-based interview.

INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Company: ${companyName}
- Interview Type: ${interview.interviewType}
- Experience Level Required: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}

JOB DESCRIPTION (excerpt):
${jobDescriptionText}

Generate a relevant question that:
1. Is appropriate for the required experience level and job role
2. Tests technical or behavioral skills based on interview type
3. Relates to the job description requirements and responsibilities
4. Is different from previous questions
5. Has appropriate difficulty level
6. Assesses the candidate's fit for the specific role

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



