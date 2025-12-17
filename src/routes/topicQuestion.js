const express = require("express");
const {
  uploadTopicQuestions,
  getTopicQuestions,
} = require("../controllers/topicQuestionController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Protected routes
router.post("/upload", authenticateToken, uploadTopicQuestions);
router.get("/:topicName", getTopicQuestions);

module.exports = router;
