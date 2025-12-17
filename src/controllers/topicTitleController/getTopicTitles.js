const TopicTitle = require("../../models/TopicTitle");
const { asyncHandler } = require("../../middleware/errorHandler");

/**
 * @desc    Get all topic titles
 * @route   GET /api/topic-titles
 * @access  Public
 */
const getTopicTitles = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;

    const TopicTitle = require("../../models/TopicTitle");
    const logger = require("../../utils/logger");

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build query
    const query = {};
    if (search) {
      query.text = { $regex: search, $options: "i" };
    }

    // Get total count
    const total = await TopicTitle.countDocuments(query);

    // Get titles
    const titles = await TopicTitle.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    res.status(200).json({
      success: true,
      data: {
        titles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    const logger = require("../../utils/logger");
    logger.error("Error getting topic titles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get topic titles",
      error: error.message,
    });
  }
};

module.exports = getTopicTitles;
