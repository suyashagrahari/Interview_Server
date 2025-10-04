const logger = require("./logger");

/**
 * Attempts to parse JSON with fallback mechanisms for malformed JSON
 * @param {string} jsonString - The JSON string to parse
 * @param {string} context - Context for logging (e.g., "follow-up question", "pool question")
 * @returns {Object} Parsed object or fallback object
 */
const parseJSONWithFallback = (jsonString, context = "unknown") => {
  if (!jsonString || typeof jsonString !== "string") {
    logger.warn(`[JSON Parser] Invalid input for ${context}:`, jsonString);
    return { success: false, error: "Invalid input", fallback: true };
  }

  // Clean the JSON string
  let cleanedJson = jsonString.trim();

  // Remove any markdown code blocks
  cleanedJson = cleanedJson.replace(/```json\s*/g, "").replace(/```\s*/g, "");

  // Try direct parsing first
  try {
    const parsed = JSON.parse(cleanedJson);
    logger.info(
      `[JSON Parser] Successfully parsed ${context} on first attempt`
    );
    return { success: true, data: parsed, fallback: false };
  } catch (error) {
    logger.warn(
      `[JSON Parser] First attempt failed for ${context}:`,
      error.message
    );
  }

  // Try to fix common JSON issues
  try {
    // Fix trailing commas
    cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, "$1");

    // Fix unquoted keys
    cleanedJson = cleanedJson.replace(
      /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g,
      '$1"$2":'
    );

    // Fix unquoted string values (be careful with this)
    cleanedJson = cleanedJson.replace(
      /:\s*([a-zA-Z_$][a-zA-Z0-9_$\s]*?)(\s*[,}])/g,
      (match, value, ending) => {
        // Only quote if it looks like a string value and not a number/boolean
        if (!/^(true|false|null|\d+\.?\d*)$/.test(value.trim())) {
          return `: "${value.trim()}"${ending}`;
        }
        return match;
      }
    );

    const parsed = JSON.parse(cleanedJson);
    logger.info(`[JSON Parser] Successfully parsed ${context} after cleaning`);
    return { success: true, data: parsed, fallback: true };
  } catch (error) {
    logger.warn(
      `[JSON Parser] Second attempt failed for ${context}:`,
      error.message
    );
  }

  // Last resort: try to extract questions using regex
  try {
    const extracted = extractQuestionsFromMalformedJSON(cleanedJson, context);
    if (extracted.success) {
      logger.info(
        `[JSON Parser] Successfully extracted ${context} using regex fallback`
      );
      return extracted;
    }
  } catch (error) {
    logger.warn(
      `[JSON Parser] Regex extraction failed for ${context}:`,
      error.message
    );
  }

  logger.error(`[JSON Parser] All parsing attempts failed for ${context}`);
  return {
    success: false,
    error: "Failed to parse JSON after all attempts",
    fallback: true,
    originalString: jsonString,
  };
};

/**
 * Extracts questions from malformed JSON using regex patterns
 * @param {string} text - The text to extract from
 * @param {string} context - Context for logging
 * @returns {Object} Extracted questions or error
 */
const extractQuestionsFromMalformedJSON = (text, context = "unknown") => {
  try {
    const questions = [];

    // Pattern to match question objects
    const questionPattern =
      /(?:question|questionText|text)\s*[:=]\s*["']([^"']+)["']/gi;
    const categoryPattern = /(?:category|type)\s*[:=]\s*["']([^"']+)["']/gi;
    const difficultyPattern =
      /(?:difficulty|level)\s*[:=]\s*["']([^"']+)["']/gi;

    let match;
    let questionIndex = 0;

    // Extract questions
    while ((match = questionPattern.exec(text)) !== null) {
      const question = match[1].trim();
      if (question && question.length > 10) {
        // Basic validation
        questions.push({
          questionId: `extracted_${context}_${questionIndex + 1}`,
          question: question,
          category: "General", // Default category
          difficulty: "medium", // Default difficulty
          expectedAnswer: "User should provide a relevant answer",
          questionType: "pool",
        });
        questionIndex++;
      }
    }

    // If we found questions, return them
    if (questions.length > 0) {
      logger.info(
        `[JSON Parser] Extracted ${questions.length} questions from malformed JSON for ${context}`
      );
      return {
        success: true,
        data: { questions },
        fallback: true,
        extracted: true,
      };
    }

    // If no questions found, try to extract any text that looks like a question
    const generalTextPattern = /["']([^"']*\?[^"']*)["']/g;
    while ((match = generalTextPattern.exec(text)) !== null) {
      const potentialQuestion = match[1].trim();
      if (potentialQuestion.length > 20 && potentialQuestion.includes("?")) {
        questions.push({
          questionId: `extracted_${context}_${questionIndex + 1}`,
          question: potentialQuestion,
          category: "General",
          difficulty: "medium",
          expectedAnswer: "User should provide a relevant answer",
          questionType: "pool",
        });
        questionIndex++;
      }
    }

    if (questions.length > 0) {
      logger.info(
        `[JSON Parser] Extracted ${questions.length} potential questions from text for ${context}`
      );
      return {
        success: true,
        data: { questions },
        fallback: true,
        extracted: true,
      };
    }

    return {
      success: false,
      error: "No questions could be extracted from the text",
      fallback: true,
    };
  } catch (error) {
    logger.error(
      `[JSON Parser] Error in regex extraction for ${context}:`,
      error
    );
    return {
      success: false,
      error: error.message,
      fallback: true,
    };
  }
};

module.exports = {
  parseJSONWithFallback,
  extractQuestionsFromMalformedJSON,
};
