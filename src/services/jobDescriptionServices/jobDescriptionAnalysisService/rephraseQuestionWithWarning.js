const { chatGPTService, logger } = require("./dependencies");

/**
 * Rephrases a question by adding a professional warning message
 * @param {string} originalQuestion - The original question to rephrase
 * @param {string} sentiment - The sentiment that triggered the warning ("NEGATIVE")
 * @returns {Promise<string>} The rephrased question with warning
 */
const rephraseQuestionWithWarning = async (originalQuestion, sentiment) => {
  if (!originalQuestion || typeof originalQuestion !== "string") {
    logger.error(
      "[RephraseQuestionWithWarning] Invalid original question provided"
    );
    return originalQuestion; // Return original if invalid
  }

  if (sentiment !== "NEGATIVE") {
    logger.warn(
      "[RephraseQuestionWithWarning] Warning requested for non-negative sentiment:",
      sentiment
    );
    return originalQuestion; // Only add warnings for negative sentiment
  }

  const prompt = `You are a professional AI interviewer. The candidate's previous answer contained inappropriate language or unprofessional content that requires a warning.

ORIGINAL QUESTION: "${originalQuestion}"

TASK: Rephrase this question to include a professional warning at the beginning, then transition smoothly to the original question.

REQUIREMENTS:
1. Start with a brief, professional warning about maintaining respectful communication
2. Acknowledge that this is a professional interview environment
3. Transition smoothly to the original question
4. Keep the warning concise but clear
5. Maintain a professional, non-confrontational tone
6. The final question should be the same as the original, just with a warning preface

FORMAT: "Please note that this is a professional interview and we expect respectful communication. Now, let's continue with the next question: [Your original question here]"

RESPONSE: Return ONLY the rephrased question with warning. Do not include any JSON formatting, explanations, or additional text.`;

  try {
    logger.info(
      "[RephraseQuestionWithWarning] Requesting ChatGPT to rephrase question with warning"
    );

    const response = await chatGPTService.generateResponse(prompt);

    if (!response || typeof response !== "string") {
      logger.warn(
        "[RephraseQuestionWithWarning] Invalid response from ChatGPT"
      );
      return getFallbackWarningQuestion(originalQuestion);
    }

    // Clean the response
    let rephrasedQuestion = response.trim();

    // Remove any markdown formatting
    rephrasedQuestion = rephrasedQuestion
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "");

    // Remove quotes if the entire response is wrapped in them
    if (rephrasedQuestion.startsWith('"') && rephrasedQuestion.endsWith('"')) {
      rephrasedQuestion = rephrasedQuestion.slice(1, -1);
    }

    // Basic validation
    if (rephrasedQuestion.length < 50) {
      logger.warn(
        "[RephraseQuestionWithWarning] Response too short, using fallback"
      );
      return getFallbackWarningQuestion(originalQuestion);
    }

    logger.info(
      "[RephraseQuestionWithWarning] Successfully rephrased question with warning"
    );
    return rephrasedQuestion;
  } catch (error) {
    logger.error(
      "[RephraseQuestionWithWarning] Error rephrasing question with warning:",
      error
    );
    return getFallbackWarningQuestion(originalQuestion);
  }
};

/**
 * Provides a fallback warning question when ChatGPT fails
 * @param {string} originalQuestion - The original question
 * @returns {string} Fallback question with warning
 */
const getFallbackWarningQuestion = (originalQuestion) => {
  const fallbackQuestion = `Please note that this is a professional interview and we expect respectful communication. Now, let's continue with the next question: ${originalQuestion}`;

  logger.info("[RephraseQuestionWithWarning] Using fallback warning question");
  return fallbackQuestion;
};

module.exports = rephraseQuestionWithWarning;
