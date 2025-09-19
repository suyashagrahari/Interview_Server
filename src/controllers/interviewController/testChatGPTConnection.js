const {
  chatGPTService,
  sendInternalServerError,
  sendSuccessResponse,
  logger,
} = require("./dependencies");

/**
 * Test ChatGPT API connection
 */
const testChatGPTConnection = async (req, res) => {
  try {
    const isWorking = await chatGPTService.testConnection();

    return sendSuccessResponse(
      res,
      200,
      isWorking ? "ChatGPT API is working" : "ChatGPT API is not working",
      {
        isWorking,
      }
    );
  } catch (error) {
    logger.error("Error testing ChatGPT connection:", error);
    return sendInternalServerError(
      res,
      "Internal server error while testing ChatGPT connection"
    );
  }
};

module.exports = testChatGPTConnection;

