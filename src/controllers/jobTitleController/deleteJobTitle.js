const JobTitle = require("../../models/JobTitle");
const logger = require("../../utils/logger");

/**
 * @desc    Delete job title by ID
 * @route   DELETE /api/job-titles/:id
 * @access  Private
 */
const deleteJobTitle = async (req, res) => {
  try {
    const { id } = req.params;

    const JobTitle = require("../../models/JobTitle");
    const logger = require("../../utils/logger");

    const title = await JobTitle.findByIdAndDelete(id);

    if (!title) {
      return res.status(404).json({
        success: false,
        message: "Job title not found",
      });
    }

    logger.info(`Deleted job title: ${title.text}`);

    res.status(200).json({
      success: true,
      message: "Job title deleted successfully",
      data: title,
    });
  } catch (error) {
    logger.error("Error deleting job title:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete job title",
      error: error.message,
    });
  }
};

module.exports = deleteJobTitle;
