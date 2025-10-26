const express = require("express");
const {
  uploadCompanyQuestions,
  getCompanyQuestions,
} = require("../controllers/companyQuestionController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Protected routes
router.post("/upload", authenticateToken, uploadCompanyQuestions);
router.get("/:companyName", getCompanyQuestions);

module.exports = router;
