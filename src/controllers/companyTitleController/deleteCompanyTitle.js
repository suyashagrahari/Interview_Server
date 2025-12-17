const CompanyTitle = require("../../models/CompanyTitle");
const logger = require("../../utils/logger");
const { asyncHandler } = require("../../middleware/errorHandler");

/**
 * @desc    Delete a company title
 * @route   DELETE /api/company-titles/:id
 * @access  Private
 */
const deleteCompanyTitle = async (req, res) => {
  try {
    const { id } = req.params;

    const CompanyTitle = require("../../models/CompanyTitle");
    const logger = require("../../utils/logger");

    const title = await CompanyTitle.findByIdAndDelete(id);

    if (!title) {
      return res.status(404).json({
        success: false,
        message: "Company title not found",
      });
    }

    logger.info(`Deleted company title: ${title.text}`);

    res.status(200).json({
      success: true,
      message: "Company title deleted successfully",
      data: title,
    });
  } catch (error) {
    const logger = require("../../utils/logger");
    logger.error("Error deleting company title:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete company title",
      error: error.message,
    });
  }
};

module.exports = deleteCompanyTitle;
