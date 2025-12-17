const CompanyTitle = require("../../models/CompanyTitle");
const { asyncHandler } = require("../../middleware/errorHandler");

/**
 * @desc    Get all company titles
 * @route   GET /api/company-titles
 * @access  Public
 */
const getCompanyTitles = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;

    const CompanyTitle = require("../../models/CompanyTitle");
    const logger = require("../../utils/logger");

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build query
    const query = {};
    if (search) {
      query.text = { $regex: search, $options: "i" };
    }

    // Get total count
    const total = await CompanyTitle.countDocuments(query);

    // Get titles
    const titles = await CompanyTitle.find(query)
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
    logger.error("Error getting company titles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get company titles",
      error: error.message,
    });
  }
};

module.exports = getCompanyTitles;
