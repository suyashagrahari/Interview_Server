const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const topicInterviewController = require("../controllers/topicControllers/topicInterviewController");

// Start new topic interview
router.post(
  "/start",
  authenticateToken,
  topicInterviewController.startInterview
);

// Check active interview
router.get(
  "/active",
  authenticateToken,
  topicInterviewController.checkActiveInterview
);

// Get interview by ID
router.get(
  "/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const TopicInterviewService = require("../services/topicServices/topicInterviewService");
      const { sendSuccessResponse, sendNotFoundError, sendInternalServerError } = require("../utils/responseHelpers");
      const logger = require("../utils/logger");

      const result = await TopicInterviewService.getInterviewById(req.params.id, req.user.id);

      if (!result.success) {
        return sendNotFoundError(res, result.message);
      }

      return sendSuccessResponse(res, 200, "Interview retrieved successfully", result.interview);
    } catch (error) {
      const logger = require("../utils/logger");
      logger.error("❌ [Topic Interview] Error getting interview by ID:", error);
      const { sendInternalServerError } = require("../utils/responseHelpers");
      return sendInternalServerError(res, "Internal server error while retrieving interview");
    }
  }
);

// End interview
router.post(
  "/:id/end",
  authenticateToken,
  async (req, res) => {
    try {
      const TopicInterviewService = require("../services/topicServices/topicInterviewService");
      const { sendSuccessResponse, sendNotFoundError, sendInternalServerError } = require("../utils/responseHelpers");
      const logger = require("../utils/logger");

      const result = await TopicInterviewService.endInterview(req.params.id, req.user.id);

      if (!result.success) {
        return sendNotFoundError(res, result.message);
      }

      return sendSuccessResponse(res, 200, "Interview ended successfully", {
        interviewId: result.interview._id,
        status: result.interview.status,
        overallAnalysis: result.overallAnalysis,
      });
    } catch (error) {
      const logger = require("../utils/logger");
      logger.error("❌ [Topic Interview] Error ending interview:", error);
      const { sendInternalServerError } = require("../utils/responseHelpers");
      return sendInternalServerError(res, "Internal server error while ending interview");
    }
  }
);

module.exports = router;
