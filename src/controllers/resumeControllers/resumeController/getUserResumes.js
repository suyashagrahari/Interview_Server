const { Resume, logger } = require("./dependencies");

/**
 * Get all resumes for authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserResumes = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const resumes = await Resume.findByUserId(req.user.id);

    const resumeList = resumes.map((resume) => ({
      id: resume._id,
      resumeName: resume.resumeName,
      originalFileName: resume.originalFileName,
      fileSize: resume.fileSize,
      fileType: resume.fileType,
      uploadDate: resume.uploadDate,
      textLength: resume.resumeText.length,
      parsedSuccessfully: resume.parsedSuccessfully,
    }));

    res.status(200).json({
      success: true,
      message: "Resumes retrieved successfully",
      data: resumeList,
    });
  } catch (error) {
    logger.error("Error retrieving resumes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while retrieving resumes",
    });
  }
};

module.exports = getUserResumes;



