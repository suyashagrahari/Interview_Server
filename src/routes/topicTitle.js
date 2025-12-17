const express = require("express");
const {
  createTopicTitle,
  getTopicTitles,
  deleteTopicTitle,
} = require("../controllers/topicTitleController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getTopicTitles);

// Protected routes
router.post("/", authenticateToken, createTopicTitle);
router.delete("/:id", authenticateToken, deleteTopicTitle);

module.exports = router;
