const {
  JobDescription,
  parseFile,
  validateFile,
  fs,
  logger,
} = require("./dependencies");

/**
 * Upload and parse JD file OR accept pasted text
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadJd = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get JD name from request body
    const { jdName, jdText } = req.body;

    if (!jdName || !jdName.trim()) {
      // Clean up uploaded file if exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: "JD name is required",
      });
    }

    // Check if JD with same name already exists for this user
    const existingJd = await JobDescription.findByUserAndName(
      req.user.id,
      jdName.trim()
    );
    if (existingJd) {
      // Clean up uploaded file if exists
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(409).json({
        success: false,
        message: "A job description with this name already exists for your account",
      });
    }

    let parsedText = "";
    let fileType = "pasted";
    let originalFileName = null;
    let fileSize = 0;
    let parsingErrors = [];

    // Check if this is a file upload or pasted text
    if (req.file) {
      // FILE UPLOAD LOGIC
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

      // Parse the file
      const parseResult = await parseFile(req.file.path);

      if (!parseResult.success) {
        // Clean up uploaded file
        if (req.file.path) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: "Failed to parse JD file",
          errors: parseResult.errors,
        });
      }

      parsedText = parseResult.text;
      originalFileName = req.file.originalname;
      fileSize = req.file.size;
      fileType = req.file.mimetype.includes("pdf")
        ? "pdf"
        : req.file.mimetype.includes("docx")
        ? "docx"
        : req.file.mimetype.includes("text")
        ? "txt"
        : "doc";
      parsingErrors = parseResult.errors || [];

      // Clean up uploaded file after successful processing
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } else if (jdText && jdText.trim()) {
      // PASTED TEXT LOGIC
      parsedText = jdText.trim();
      fileType = "pasted";

      // Validate text length
      if (parsedText.length > 50000) {
        return res.status(400).json({
          success: false,
          message: "JD text exceeds maximum length of 50000 characters",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Either upload a file or provide JD text",
      });
    }

    // Create JD record
    const jd = new JobDescription({
      userId: req.user.id,
      jdName: jdName.trim(),
      jdText: parsedText,
      originalFileName,
      fileSize,
      fileType,
      parsedSuccessfully: true,
      parsingErrors,
    });

    logger.info("Job Description -->", jd);
    await jd.save();

    logger.info(
      `Job Description uploaded successfully for user ${req.user.id}: ${jdName}`
    );

    res.status(201).json({
      success: true,
      message: "Job description uploaded successfully",
      data: {
        id: jd._id,
        jdName: jd.jdName,
        originalFileName: jd.originalFileName,
        fileSize: jd.fileSize,
        fileType: jd.fileType,
        uploadDate: jd.uploadDate,
        textLength: jd.jdText.length,
      },
    });
  } catch (error) {
    logger.error("Error uploading job description:", error);

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
      message: "Internal server error while uploading job description",
    });
  }
};

module.exports = uploadJd;
