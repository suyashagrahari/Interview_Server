const { chatGPTService, logger } = require("./dependencies");

/**
 * Test ChatGPT API connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const testChatGPTConnection = async (req, res) => {
  try {
    const isWorking = await chatGPTService.testConnection();

    res.status(200).json({
      success: true,
      message: isWorking
        ? "ChatGPT API is working"
        : "ChatGPT API is not working",
      data: {
        isWorking,
      },
    });
  } catch (error) {
    logger.error("Error testing ChatGPT connection:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while testing ChatGPT connection",
    });
  }
};

module.exports = testChatGPTConnection;

