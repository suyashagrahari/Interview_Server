const { chatGPTService, logger } = require("./dependencies");

/**
 * Generate follow-up question based on previous answer
 * @param {Object} interview - Interview object
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

  const prompt = `Generate a follow-up question for an interview.

PREVIOUS QUESTION: ${previousQuestion.question}
CANDIDATE ANSWER: ${answer}
INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Interview Type: ${interview.interviewType}
- Experience Level: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}
- Resume: ${interview.resumeId.resumeText.substring(0, 1000)}...

Generate a relevant follow-up question that:
1. Builds on the previous answer
2. Goes deeper into the topic
3. Tests different aspects of their knowledge
4. Is appropriate for their experience level
5. Is a natural progression from the previous question

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



