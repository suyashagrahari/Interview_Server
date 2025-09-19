const { axios, logger, config } = require("./dependencies");
const buildPrompt = require("./buildPrompt");

/**
 * Generate interview questions based on resume and interview parameters
 * @param {Object} params - Parameters for question generation
 * @param {string} params.resumeText - The resume text content
 * @param {string} params.interviewType - Type of interview (technical/behavioral)
 * @param {string} params.level - Experience level (0-2, 3-4, etc.)
 * @param {string} params.difficultyLevel - Difficulty level (beginner/intermediate/expert)
 * @param {string} params.jobRole - Job role for the interview
 * @returns {Promise<Object>} Generated questions with answers and keywords
 */
const generateInterviewQuestions = async ({
  resumeText,
  interviewType,
  level,
  difficultyLevel,
  jobRole,
}) => {
  try {
    const prompt = buildPrompt({
      resumeText,
      interviewType,
      level,
      difficultyLevel,
      jobRole,
    });

    const response = await axios.post(
      config.baseURL,
      {
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert technical interviewer who creates comprehensive interview questions based on resumes. Always respond with valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const content = response.data.choices[0].message.content;
    const usage = response.data.usage;

    logger.info("ChatGPT API response received", {
      totalTokens: usage.total_tokens,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    });

    // Parse the JSON response (handle markdown code blocks)
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonContent = content.split("```")[1].split("```")[0].trim();
    }
    const questionsData = JSON.parse(jsonContent);

    return {
      success: true,
      questions: questionsData.questions,
      totalTokensUsed: usage.total_tokens,
    };
  } catch (error) {
    logger.error("Error generating interview questions:", error);

    if (error.response) {
      logger.error("ChatGPT API Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    throw new Error(`Failed to generate interview questions: ${error.message}`);
  }
};

module.exports = generateInterviewQuestions;



