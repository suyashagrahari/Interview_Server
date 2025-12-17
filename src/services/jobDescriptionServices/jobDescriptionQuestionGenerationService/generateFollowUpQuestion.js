const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate follow-up question based on previous answer for job description interviews
 * @param {Object} interview - Interview object (with populated jobDescriptionId)
 * @param {Object} previousQuestion - Previous question object
 * @param {string} answer - Previous answer
 * @param {number} questionIndex - Current question index
 * @returns {Object} Generated follow-up question
 */
const generateFollowUpQuestion = async (
  interview,
  previousQuestion,
  answer,
  questionIndex
) => {
  const safeQuestionIndex =
    typeof questionIndex === "number" && !isNaN(questionIndex)
      ? questionIndex
      : 0;

  // Get job description text instead of resume text
  const jobDescriptionText =
    interview.jobDescriptionId?.jdText?.substring(0, 1000) ||
    "No job description data available";
  const companyName = interview.companyName || "the company";

  const prompt = `Generate a follow-up question for a job description-based interview.

PREVIOUS QUESTION: ${previousQuestion.question}
CANDIDATE ANSWER: ${answer}

INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Company: ${companyName}
- Interview Type: ${interview.interviewType}
- Experience Level Required: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}

JOB DESCRIPTION (excerpt):
${jobDescriptionText}

Generate a relevant follow-up question that:
1. Builds on the previous answer
2. Goes deeper into the topic
3. Relates to the job requirements and responsibilities
4. Tests different aspects of their knowledge and experience
5. Is appropriate for the required experience level
6. Is a natural progression from the previous question
7. Assesses how well they fit the job description requirements

Respond with JSON format:
{
  "questionId": "followup_${safeQuestionIndex + 1}",
  "question": "The follow-up question",
  "category": "Technical Skills",
  "difficulty": "medium",
  "expectedAnswer": "Expected answer format"
}`;

  try {
    const response = await chatGPTService.generateResponse(prompt);
    const questionData = JSON.parse(response.content);

    return {
      questionId:
        questionData.questionId || `followup_${safeQuestionIndex + 1}`,
      question: questionData.question,
      category: questionData.category || "Follow-up",
      difficulty: questionData.difficulty || "medium",
      expectedAnswer:
        questionData.expectedAnswer ||
        "Candidate should provide a detailed response building on their previous answer",
    };
  } catch (error) {
    logger.error("Error generating follow-up question:", error);

    // Fallback question
    return {
      questionId: `followup_${safeQuestionIndex + 1}`,
      question:
        "Can you elaborate more on that point? What specific challenges did you face and how did you overcome them?",
      category: "Follow-up",
      difficulty: "medium",
      expectedAnswer:
        "Candidate should provide more details about their previous answer",
    };
  }
};

module.exports = generateFollowUpQuestion;



