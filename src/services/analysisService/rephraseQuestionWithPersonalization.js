const { chatGPTService, logger } = require("./dependencies");

/**
 * Personalizes a pool question based on the previous answer and sentiment
 * @param {string} originalQuestion - The original pool question
 * @param {string} previousAnswer - The user's previous answer
 * @param {string} sentiment - The sentiment of the previous answer ("POSITIVE", "NEGATIVE", "NEUTRAL")
 * @returns {Promise<string>} The personalized question
 */
const rephraseQuestionWithPersonalization = async (
  originalQuestion,
  previousAnswer,
  sentiment
) => {
  if (!originalQuestion || typeof originalQuestion !== "string") {
    logger.error(
      "[RephraseQuestionWithPersonalization] Invalid original question provided"
    );
    return originalQuestion;
  }

  if (!previousAnswer || typeof previousAnswer !== "string") {
    logger.error(
      "[RephraseQuestionWithPersonalization] Invalid previous answer provided"
    );
    return originalQuestion;
  }

  const prompt = `You are a professional AI interviewer. Based on the candidate's previous answer and its sentiment analysis, personalize the next question.

PREVIOUS ANSWER: "${previousAnswer}"
SENTIMENT: ${sentiment}
ORIGINAL QUESTION: "${originalQuestion}"

TASK: Create a personalized version of the original question that:
1. Acknowledges their previous answer in one line
2. Includes a professional warning if sentiment is NEGATIVE
3. Transitions smoothly to the original question
4. Maintains professional tone throughout

SENTIMENT-BASED INSTRUCTIONS:

${
  sentiment === "NEGATIVE"
    ? `
NEGATIVE SENTIMENT DETECTED:
- The candidate's answer contained inappropriate language, unprofessional tone, or abusive content
- You MUST include a professional warning at the beginning
- Acknowledge their previous answer in one line professionally
- Then transition to the original question

REQUIRED FORMAT FOR NEGATIVE SENTIMENT:
"Please note that this is a professional interview and we expect respectful communication. I understand you mentioned [brief reference to their answer]. Now, let's continue with the next question: [Your original question here]"
`
    : sentiment === "POSITIVE"
    ? `
POSITIVE SENTIMENT DETECTED:
- The candidate gave a good, professional answer
- Acknowledge their good response in one line
- Transition smoothly to the original question

REQUIRED FORMAT FOR POSITIVE SENTIMENT:
"Excellent answer! You mentioned [something from their answer]. Now, let's move on to [your original question here]"
`
    : `
NEUTRAL SENTIMENT DETECTED:
- The candidate gave a standard, acceptable answer
- Acknowledge their response briefly
- Transition to the original question

REQUIRED FORMAT FOR NEUTRAL SENTIMENT:
"Thank you for that answer. You mentioned [something from their answer]. Now, let's continue with [your original question here]"
`
}

RESPONSE: Return ONLY the personalized question. Do not include any JSON formatting, explanations, or additional text.`;

  try {
    logger.info(
      "[RephraseQuestionWithPersonalization] Requesting ChatGPT to personalize question"
    );

    const response = await chatGPTService.generateResponse(prompt);

    if (!response || typeof response !== "string") {
      logger.warn(
        "[RephraseQuestionWithPersonalization] Invalid response from ChatGPT"
      );
      return getFallbackPersonalizedQuestion(
        originalQuestion,
        previousAnswer,
        sentiment
      );
    }

    // Clean the response
    let personalizedQuestion = response.trim();

    // Remove any markdown formatting
    personalizedQuestion = personalizedQuestion
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "");

    // Remove quotes if the entire response is wrapped in them
    if (
      personalizedQuestion.startsWith('"') &&
      personalizedQuestion.endsWith('"')
    ) {
      personalizedQuestion = personalizedQuestion.slice(1, -1);
    }

    // Basic validation
    if (personalizedQuestion.length < 50) {
      logger.warn(
        "[RephraseQuestionWithPersonalization] Response too short, using fallback"
      );
      return getFallbackPersonalizedQuestion(
        originalQuestion,
        previousAnswer,
        sentiment
      );
    }

    logger.info(
      "[RephraseQuestionWithPersonalization] Successfully personalized question"
    );
    return personalizedQuestion;
  } catch (error) {
    logger.error(
      "[RephraseQuestionWithPersonalization] Error personalizing question:",
      error
    );
    return getFallbackPersonalizedQuestion(
      originalQuestion,
      previousAnswer,
      sentiment
    );
  }
};

/**
 * Provides fallback personalized questions when ChatGPT fails
 * @param {string} originalQuestion - The original question
 * @param {string} previousAnswer - The previous answer
 * @param {string} sentiment - The sentiment
 * @returns {string} Fallback personalized question
 */
const getFallbackPersonalizedQuestion = (
  originalQuestion,
  previousAnswer,
  sentiment
) => {
  let fallbackQuestion;

  if (sentiment === "NEGATIVE") {
    fallbackQuestion = `Please note that this is a professional interview and we expect respectful communication. I understand you mentioned something in your previous answer. Now, let's continue with the next question: ${originalQuestion}`;
  } else if (sentiment === "POSITIVE") {
    fallbackQuestion = `Great answer! You provided some good insights. Now, let's move on to the next question: ${originalQuestion}`;
  } else {
    fallbackQuestion = `Thank you for that answer. Now, let's continue with the next question: ${originalQuestion}`;
  }

  logger.info(
    "[RephraseQuestionWithPersonalization] Using fallback personalized question"
  );
  return fallbackQuestion;
};

module.exports = rephraseQuestionWithPersonalization;
