const CompanyTitle = require("../../models/CompanyTitle");
const logger = require("../../utils/logger");
const { asyncHandler } = require("../../middleware/errorHandler");

/**
 * @desc    Create company titles (bulk)
 * @route   POST /api/company-titles
 * @access  Private
 */
const createCompanyTitle = async (req, res) => {
  try {
    const { titles } = req.body;

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Titles array is required and cannot be empty",
      });
    }

    const CompanyTitle = require("../../models/CompanyTitle");
    const logger = require("../../utils/logger");

    // Validate each title
    const validTitles = titles
      .map((title) => {
        const text = typeof title === "string" ? title : title.text;
        return text && text.trim() ? text.trim() : null;
      })
      .filter((text) => text !== null);

    if (validTitles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid titles provided",
      });
    }

    // Check for duplicates before inserting
    const existingTitles = await CompanyTitle.find({
      text: { $in: validTitles },
    });
    const existingTexts = new Set(existingTitles.map((t) => t.text));

    // Filter out duplicates
    const newTitles = validTitles
      .filter((text) => !existingTexts.has(text))
      .map((text) => ({
        text,
        createdAt: new Date(),
      }));

    if (newTitles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All titles already exist",
      });
    }

    // Bulk insert new titles
    const savedTitles = await CompanyTitle.insertMany(newTitles);

    logger.info(`Created ${savedTitles.length} company titles`);

    res.status(201).json({
      success: true,
      message: `Successfully created ${savedTitles.length} company title(s)`,
      data: {
        created: savedTitles.length,
        skipped: validTitles.length - savedTitles.length,
        titles: savedTitles,
      },
    });
  } catch (error) {
    logger.error("Error creating company titles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create company titles",
      error: error.message,
    });
  }
};

module.exports = createCompanyTitle;
