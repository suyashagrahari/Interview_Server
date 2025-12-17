const express = require("express");
const router = express.Router();

const {
  generateFromResume,
  generateFromJd,
  generateFromBoth,
  extractUpload,
  extractText,
} = require("../controllers/coverLetterController");

// POST /api/cover-letter/from-resume
router.post("/from-resume", generateFromResume);

// POST /api/cover-letter/from-jd
router.post("/from-jd", generateFromJd);

// POST /api/cover-letter/from-both
router.post("/from-both", generateFromBoth);

// POST /api/cover-letter/extract-text  (multipart file field: file)
router.post("/extract-text", extractUpload, extractText);

module.exports = router;
