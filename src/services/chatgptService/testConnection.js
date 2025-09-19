const { axios, logger, config } = require("./dependencies");

/**
 * Test the ChatGPT API connection
 * @returns {Promise<boolean>} Whether the API is working
 */
const testConnection = async () => {
  try {
    const response = await axios.post(
      config.baseURL,
      {
        model: config.model,
        messages: [
          {
            role: "user",
            content: "Hello, please respond with 'API is working'",
          },
        ],
        max_tokens: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.includes("API is working");
  } catch (error) {
    logger.error("ChatGPT API connection test failed:", error);
    return false;
  }
};

module.exports = testConnection;



