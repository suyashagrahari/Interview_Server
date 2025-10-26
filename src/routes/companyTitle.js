const express = require("express");
const {
  createCompanyTitle,
  getCompanyTitles,
  deleteCompanyTitle,
} = require("../controllers/companyTitleController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Public routes
router.get("/", getCompanyTitles);

// Protected routes
router.post("/", authenticateToken, createCompanyTitle);
router.delete("/:id", authenticateToken, deleteCompanyTitle);

module.exports = router;
