const { axios, logger, config } = require("./dependencies");

/**
 * Generate a response using ChatGPT
 * @param {string} prompt - The prompt to send to ChatGPT
 * @param {number} maxTokens - Maximum tokens for response
 * @param {number} temperature - Temperature for response generation
 * @returns {Promise<string>} The generated response
 */
const generateResponse = async (
  prompt,
  maxTokens = 2000,
  temperature = 0.7
) => {
  try {
    const response = await axios.post(
      config.baseURL,
      {
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert AI assistant. Always respond with valid JSON format when requested.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
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

    logger.info("ChatGPT response generated", {
      totalTokens: usage.total_tokens,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
    });

    // Handle markdown code blocks in response
    let jsonContent = content;
    if (content.includes("```json")) {
      jsonContent = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonContent = content.split("```")[1].split("```")[0].trim();
    }
    return jsonContent;
  } catch (error) {
    logger.error("Error generating ChatGPT response:", error);

    if (error.response) {
      logger.error("ChatGPT API Error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    throw new Error(`Failed to generate response: ${error.message}`);
  }
};

module.exports = generateResponse;



