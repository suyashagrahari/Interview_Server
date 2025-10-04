const generateResponse = require("../chatgptService/generateResponse");
const logger = require("../../utils/logger");

/**
 * Analyze sentiment of a given text using ChatGPT
 * @param {string} text - The text to analyze
 * @returns {Promise<Object>} Sentiment analysis result
 */
const analyzeSentiment = async (text) => {
  if (!text || typeof text !== "string") {
    logger.error("[SentimentAnalysis] Invalid text provided for analysis");
    return {
      success: false,
      error: "Invalid text provided",
      sentiment: "NEUTRAL",
    };
  }

  const prompt = `Analyze the sentiment and appropriateness of the following text for a professional interview setting.

TEXT TO ANALYZE: "${text}"

Please analyze this text and determine:
1. Overall sentiment (POSITIVE, NEGATIVE, or NEUTRAL)
2. Whether it contains inappropriate language or unprofessional content
3. Whether it's suitable for a professional interview environment

Respond with JSON format:
{
  "sentiment": "POSITIVE|NEGATIVE|NEUTRAL",
  "confidence": 0.95,
  "abusiveLanguage": false,
  "inappropriateContent": false,
  "professionalAppropriate": true,
  "analysisDetails": "Brief explanation of the analysis",
  "detectedIssues": ["list", "of", "any", "issues"],
  "severityScore": 0.1
}

Guidelines:
- POSITIVE: Professional, constructive, appropriate language
- NEUTRAL: Standard, acceptable language without strong positive/negative tone
- NEGATIVE: Inappropriate, unprofessional, abusive, or offensive language
- abusiveLanguage: true if contains profanity, insults, or offensive terms
- inappropriateContent: true if contains unprofessional or inappropriate content
- professionalAppropriate: true if suitable for professional interview
- severityScore: 0.0-1.0 (0.0 = completely appropriate, 1.0 = highly inappropriate)`;

  try {
    logger.info(
      `[SentimentAnalysis] Analyzing sentiment for text: "${text.substring(
        0,
        100
      )}..."`
    );

    const response = await generateResponse(prompt);

    if (!response || typeof response !== "string") {
      logger.warn("[SentimentAnalysis] Invalid response from ChatGPT");
      return getFallbackSentimentResult();
    }

    // Parse the JSON response
    let analysisData;
    try {
      // Clean the response
      let jsonContent = response.trim();

      // Remove markdown code blocks
      if (jsonContent.includes("```json")) {
        jsonContent = jsonContent.split("```json")[1].split("```")[0].trim();
      } else if (jsonContent.includes("```")) {
        jsonContent = jsonContent.split("```")[1].split("```")[0].trim();
      }

      // Remove quotes if wrapped
      if (jsonContent.startsWith('"') && jsonContent.endsWith('"')) {
        jsonContent = jsonContent.slice(1, -1);
      }

      analysisData = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.warn(
        "[SentimentAnalysis] Failed to parse ChatGPT response, using fallback"
      );
      return getFallbackSentimentResult();
    }

    // Validate the response structure
    if (
      !analysisData.sentiment ||
      !["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(analysisData.sentiment)
    ) {
      logger.warn(
        "[SentimentAnalysis] Invalid sentiment value in response, using fallback"
      );
      return getFallbackSentimentResult();
    }

    logger.info(
      `[SentimentAnalysis] Successfully analyzed sentiment: ${analysisData.sentiment}`
    );

    return {
      success: true,
      sentiment: analysisData.sentiment,
      confidence: analysisData.confidence || 0.8,
      abusiveLanguage: analysisData.abusiveLanguage || false,
      inappropriateContent: analysisData.inappropriateContent || false,
      professionalAppropriate: analysisData.professionalAppropriate !== false,
      analysisDetails:
        analysisData.analysisDetails || "Sentiment analysis completed",
      detectedIssues: analysisData.detectedIssues || [],
      severityScore: analysisData.severityScore || 0.0,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("[SentimentAnalysis] Error analyzing sentiment:", error);
    return getFallbackSentimentResult();
  }
};

/**
 * Provides fallback sentiment analysis when ChatGPT fails
 * @returns {Object} Fallback sentiment result
 */
const getFallbackSentimentResult = () => {
  logger.info("[SentimentAnalysis] Using fallback sentiment analysis");

  return {
    success: false,
    error: "Sentiment analysis service unavailable",
    sentiment: "NEUTRAL",
    confidence: 0.5,
    abusiveLanguage: false,
    inappropriateContent: false,
    professionalAppropriate: true,
    analysisDetails: "Fallback analysis - assuming neutral sentiment",
    detectedIssues: [],
    severityScore: 0.0,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Test the sentiment analysis service
 * @returns {Promise<boolean>} Whether the service is working
 */
const testSentimentAnalysis = async () => {
  try {
    const testResult = await analyzeSentiment(
      "This is a test message for sentiment analysis."
    );
    return testResult.success;
  } catch (error) {
    logger.error("[SentimentAnalysis] Test failed:", error);
    return false;
  }
};

module.exports = {
  analyzeSentiment,
  testSentimentAnalysis,
};
