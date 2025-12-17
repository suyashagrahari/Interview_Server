const TopicTitle = require("../../models/TopicTitle");
const logger = require("../../utils/logger");
const { asyncHandler } = require("../../middleware/errorHandler");

/**
 * @desc    Delete a topic title
 * @route   DELETE /api/topic-titles/:id
 * @access  Private
 */
const deleteTopicTitle = async (req, res) => {
  try {
    const { id } = req.params;

    const TopicTitle = require("../../models/TopicTitle");
    const logger = require("../../utils/logger");

    const title = await TopicTitle.findByIdAndDelete(id);

    if (!title) {
      return res.status(404).json({
        success: false,
        message: "Topic title not found",
      });
    }

    logger.info(`Deleted topic title: ${title.text}`);

    res.status(200).json({
      success: true,
      message: "Topic title deleted successfully",
      data: title,
    });
  } catch (error) {
    const logger = require("../../utils/logger");
    logger.error("Error deleting topic title:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete topic title",
      error: error.message,
    });
  }
};

module.exports = deleteTopicTitle;
