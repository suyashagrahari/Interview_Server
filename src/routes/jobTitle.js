const express = require("express");
const {
  createJobTitle,
  getJobTitles,
  deleteJobTitle,
} = require("../controllers/jobTitleController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getJobTitles);

// Protected routes
router.post("/", authenticateToken, createJobTitle);
router.delete("/:id", authenticateToken, deleteJobTitle);

module.exports = router;
