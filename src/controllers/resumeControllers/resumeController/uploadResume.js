const {
  Resume,
  parseFile,
  validateFile,
  fs,
  logger,
} = require("./dependencies");

/**
 * Upload and parse resume file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadResume = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      // Clean up uploaded file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "File validation failed",
        errors: validation.errors,
      });
    }

    // Get resume name from request body
    const { resumeName } = req.body;
    if (!resumeName || !resumeName.trim()) {
      // Clean up uploaded file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "Resume name is required",
      });
    }

    // Check if resume with same name already exists for this user
    const existingResume = await Resume.findByUserAndName(
      req.user.id,
      resumeName.trim()
    );
    if (existingResume) {
      // Clean up uploaded file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        message: "A resume with this name already exists for your account",
      });
    }

    // Parse the file
    const parseResult = await parseFile(req.file.path);

    if (!parseResult.success) {
      // Clean up uploaded file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "Failed to parse resume file",
        errors: parseResult.errors,
      });
    }

    // Create resume record
    const resume = new Resume({
      userId: req.user.id,
      resumeName: resumeName.trim(),
      resumeText: parseResult.text,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype.includes("pdf")
        ? "pdf"
        : req.file.mimetype.includes("docx")
        ? "docx"
        : "doc",
      parsedSuccessfully: true,
      parsingErrors: parseResult.errors,
    });

    logger.info("resume -->", resume);
    await resume.save();

    // Clean up uploaded file after successful processing
    if (req.file.path) {
      fs.unlinkSync(req.file.path);
    }

    logger.info(
      `Resume uploaded successfully for user ${req.user.id}: ${resumeName}`
    );

    res.status(201).json({
      success: true,
      message: "Resume uploaded and parsed successfully",
      data: {
        id: resume._id,
        resumeName: resume.resumeName,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        fileType: resume.fileType,
        uploadDate: resume.uploadDate,
        textLength: resume.resumeText.length,
      },
    });
  } catch (error) {
    logger.error("Error uploading resume:", error);

    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error("Error cleaning up uploaded file:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while uploading resume",
    });
  }
};

module.exports = uploadResume;



