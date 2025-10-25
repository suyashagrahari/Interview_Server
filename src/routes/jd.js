const express = require("express");
const multer = require("multer");
const path = require("path");
const { body } = require("express-validator");
const { authenticateToken } = require("../middleware/auth");
const {
  uploadJd,
  getUserJds,
  getJdById,
  deleteJd,
} = require("../controllers/jdController");
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
    cb(null, `jd-${uniqueSuffix}${extension}`);
  },
});

// File filter to only allow specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed."
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
  body("jdName")
    .trim()
    .notEmpty()
    .withMessage("JD name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("JD name must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage(
      "JD name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  body("jdText")
    .optional()
    .trim()
    .isLength({ max: 50000 })
    .withMessage("JD text cannot exceed 50000 characters"),
  handleValidationErrors,
];

// Routes

/**
 * @route   POST /api/jd/upload
 * @desc    Upload and parse JD file OR accept pasted text
 * @access  Private
 */
router.post(
  "/upload",
  authenticateToken,
  upload.single("jd"),
  uploadValidation[0],
  uploadValidation[1],
  uploadValidation[2],
  uploadJd
);

/**
 * @route   GET /api/jd
 * @desc    Get all job descriptions for authenticated user
 * @access  Private
 */
router.get("/", authenticateToken, getUserJds);

/**
 * @route   GET /api/jd/:id
 * @desc    Get specific job description by ID
 * @access  Private
 */
router.get("/:id", authenticateToken, getJdById);

/**
 * @route   DELETE /api/jd/:id
 * @desc    Delete job description by ID
 * @access  Private
 */
router.delete("/:id", authenticateToken, deleteJd);

module.exports = router;
