const express = require("express");
const router = express.Router();
const {
  getAllInterviewers,
  getInterviewerById,
  createInterviewer,
  updateInterviewer,
  deleteInterviewer,
} = require("../controllers/interviewerController");
const { authenticateToken } = require("../middleware/auth");

// Public routes
router.get("/", getAllInterviewers);
router.get("/:id", getInterviewerById);

// Protected routes (admin only)
router.post("/", authenticateToken, createInterviewer);
router.put("/:id", authenticateToken, updateInterviewer);
router.delete("/:id", authenticateToken, deleteInterviewer);

module.exports = router;
