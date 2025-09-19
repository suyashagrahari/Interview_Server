const { Resume, logger } = require("./dependencies");

/**
 * Get specific resume by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getResumeById = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;
    const resume = await Resume.findOne({
      _id: id,
      userId: req.user.id,
      isActive: true,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Resume retrieved successfully",
      data: {
        id: resume._id,
        resumeName: resume.resumeName,
        resumeText: resume.resumeText,
        originalFileName: resume.originalFileName,
        fileSize: resume.fileSize,
        fileType: resume.fileType,
        uploadDate: resume.uploadDate,
        parsedSuccessfully: resume.parsedSuccessfully,
        parsingErrors: resume.parsingErrors,
      },
    });
  } catch (error) {
    logger.error("Error retrieving resume:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving resume",
    });
  }
};

module.exports = getResumeById;



