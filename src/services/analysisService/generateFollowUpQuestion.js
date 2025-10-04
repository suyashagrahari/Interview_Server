const { chatGPTService, logger } = require("./dependencies");
const { parseJSONWithFallback } = require("../../utils/jsonParser");

/**
 * Generate follow-up question based on previous answer and sentiment
 * @param {Object} interview - Interview object
 * @param {Object} previousQuestion - Previous question object
 * @param {string} answer - Previous answer
 * @param {number} questionIndex - Current question index
 * @param {string} sentiment - Sentiment of the previous answer ("POSITIVE", "NEGATIVE", "NEUTRAL")
 * @returns {Object} Generated follow-up question
 */
const generateFollowUpQuestion = async (
  interview,
  previousQuestion,
  answer,
  questionIndex,
  sentiment = "NEUTRAL"
) => {
  const safeQuestionIndex =
    typeof questionIndex === "number" && !isNaN(questionIndex)
      ? questionIndex
      : 0;

  // Generate unique ID for follow-up question
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const uniqueFollowUpId = `followup_${timestamp}_${random}`;

  const prompt = `You are an expert interview AI. Generate a follow-up question based on the candidate's previous answer and its sentiment analysis.

PREVIOUS QUESTION: ${previousQuestion.question}
CANDIDATE ANSWER: ${answer}
SENTIMENT ANALYSIS: ${sentiment}
INTERVIEW CONTEXT:
- Job Role: ${interview.jobRole}
- Interview Type: ${interview.interviewType}
- Experience Level: ${interview.level}
- Difficulty Level: ${interview.difficultyLevel}
- Resume: ${interview.resumeId.resumeText.substring(0, 1000)}...

SENTIMENT-BASED INSTRUCTIONS:
${
  sentiment === "NEGATIVE"
    ? `
NEGATIVE SENTIMENT DETECTED:
- The candidate's answer contained inappropriate language, unprofessional tone, or abusive content
- You MUST include a professional warning at the beginning of your question
- Acknowledge their previous answer in one line professionally
- Ask a simpler, more basic follow-up question to give them a chance to improve
- Keep the tone professional and supportive

REQUIRED FORMAT FOR NEGATIVE SENTIMENT:
"Please note that this is a professional interview and we expect respectful communication. I understand you mentioned [brief reference to their answer]. Now, let's continue with a simpler question: [Your simple follow-up question here]"
`
    : sentiment === "POSITIVE"
    ? `
POSITIVE SENTIMENT DETECTED:
- The candidate gave a good, professional answer
- Acknowledge their good response in one line
- Ask a more challenging follow-up question to test their knowledge further
- Build on their strengths

REQUIRED FORMAT FOR POSITIVE SENTIMENT:
"Excellent answer! You mentioned [something from their answer]. Now, let's explore [your challenging follow-up question]"
`
    : `
NEUTRAL SENTIMENT DETECTED:
- The candidate gave a standard, acceptable answer
- Acknowledge their response briefly
- Ask a standard follow-up question to go deeper

REQUIRED FORMAT FOR NEUTRAL SENTIMENT:
"Thank you for that answer. You mentioned [something from their answer]. Now, let's move on to [your follow-up question]"
`
}

Generate a relevant follow-up question that:
1. Follows the sentiment-based format above
2. Builds on the previous answer appropriately
3. Is appropriate for their experience level
4. Maintains professional tone throughout

Respond with JSON format:
{
  "questionId": "${uniqueFollowUpId}",
  "question": "The complete follow-up question with sentiment-based introduction",
  "category": "Follow-up",
  "difficulty": "medium",
  "expectedAnswer": "Expected answer format",
  "warningIncluded": ${sentiment === "NEGATIVE" ? "true" : "false"},
  "sentimentBased": true,
  "originalSentiment": "${sentiment}"
}`;

  try {
    logger.info(
      `[GenerateFollowUpQuestion] Generating follow-up question with sentiment: ${sentiment}`
    );
    const response = await chatGPTService.generateResponse(prompt);

    // Use the robust JSON parser
    const parseResult = parseJSONWithFallback(response, "follow-up question");

    if (parseResult.success) {
      const questionData = parseResult.data;
      logger.info(
        `[GenerateFollowUpQuestion] Successfully generated follow-up question`
      );

      return {
        questionId: questionData.questionId || uniqueFollowUpId,
        question: questionData.question,
        category: questionData.category || "Follow-up",
        difficulty: questionData.difficulty || "medium",
        expectedAnswer:
          questionData.expectedAnswer ||
          "Candidate should provide a detailed response building on their previous answer",
        warningIncluded:
          questionData.warningIncluded || sentiment === "NEGATIVE",
        sentimentBased: questionData.sentimentBased || true,
        originalSentiment: questionData.originalSentiment || sentiment,
      };
    } else {
      logger.warn(
        `[GenerateFollowUpQuestion] JSON parsing failed, using fallback`
      );
      return getFallbackFollowUpQuestion(uniqueFollowUpId, sentiment);
    }
  } catch (error) {
    logger.error("Error generating follow-up question:", error);
    return getFallbackFollowUpQuestion(uniqueFollowUpId, sentiment);
  }
};

/**
 * Provides fallback follow-up questions when ChatGPT fails
 * @param {string} uniqueFollowUpId - The unique ID for the question
 * @param {string} sentiment - The sentiment of the previous answer
 * @returns {Object} Fallback follow-up question
 */
const getFallbackFollowUpQuestion = (uniqueFollowUpId, sentiment) => {
  let fallbackQuestion;

  if (sentiment === "NEGATIVE") {
    fallbackQuestion =
      "Please note that this is a professional interview and we expect respectful communication. Now, let's continue with a simpler question: Can you tell me about a time when you had to work with a difficult team member and how you handled the situation?";
  } else if (sentiment === "POSITIVE") {
    fallbackQuestion =
      "Great answer! You provided some good insights. Now, let's explore this further: Can you give me a specific example of how you applied this knowledge in a real-world scenario?";
  } else {
    fallbackQuestion =
      "Thank you for that answer. Now, let's move on to a follow-up question: Can you elaborate more on that point and provide some specific details?";
  }

  logger.info(
    `[GenerateFollowUpQuestion] Using fallback follow-up question for sentiment: ${sentiment}`
  );

  return {
    questionId: uniqueFollowUpId,
    question: fallbackQuestion,
    category: "Follow-up",
    difficulty: "medium",
    expectedAnswer:
      "Candidate should provide a detailed response building on their previous answer",
    warningIncluded: sentiment === "NEGATIVE",
    sentimentBased: true,
    originalSentiment: sentiment,
  };
};

module.exports = generateFollowUpQuestion;
