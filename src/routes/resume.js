const express = require("express");
const multer = require("multer");
const path = require("path");
const { body } = require("express-validator");
const { authenticateToken } = require("../middleware/auth");
const {
  uploadResume,
  getUserResumes,
  getResumeById,
  deleteResume,
} = require("../controllers/resumeController");
const { handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(__dirname, "../../uploads");
    require("fs").mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `resume-${uniqueSuffix}${extension}`);
  },
});

// File filter to only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, and DOCX files are allowed."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Validation rules
const uploadValidation = [
  body("resumeName")
    .trim()
    .notEmpty()
    .withMessage("Resume name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Resume name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "Resume name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  handleValidationErrors,
];

// Routes

/**
 * @route   POST /api/resume/upload
 * @desc    Upload and parse resume file
 * @access  Private
 */
router.post(
  "/upload",
  authenticateToken,
  upload.single("resume"),
  uploadValidation[0],
  uploadValidation[1],
  uploadResume
);

/**
 * @route   GET /api/resume
 * @desc    Get all resumes for authenticated user
 * @access  Private
 */
router.get("/", authenticateToken, getUserResumes);

/**
 * @route   GET /api/resume/:id
 * @desc    Get specific resume by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getResumeById);

/**
 * @route   DELETE /api/resume/:id
 * @desc    Delete resume by ID
 * @access  Private
 */
router.delete("/:id", authenticateToken, deleteResume);

module.exports = router;
