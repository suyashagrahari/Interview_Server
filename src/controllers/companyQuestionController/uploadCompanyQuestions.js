const CompanyQuestionModelFactory = require("../../models/CompanyQuestion");
const logger = require("../../utils/logger");

/**
 * @desc    Upload company questions (bulk)
 * @route   POST /api/company-questions/upload
 * @access  Private
 */
const uploadCompanyQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Questions array is required and cannot be empty",
      });
    }

    // Validate questions structure
    const validQuestions = questions.filter((question) => {
      return (
        question.companyName &&
        question.companyName.trim() &&
        question.jobRole &&
        question.jobRole.trim() &&
        question.experienceLevel &&
        question.difficultyLevel &&
        question.questionType &&
        question.questionText &&
        question.questionText.trim() &&
        question.expectedAnswer &&
        question.expectedAnswer.trim()
      );
    });

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid questions provided",
      });
    }

    // Group questions by company to handle multiple companies in one upload
    const questionsByCompany = {};
    validQuestions.forEach((question) => {
      const companyName = question.companyName.trim();
      if (!questionsByCompany[companyName]) {
        questionsByCompany[companyName] = [];
      }
      questionsByCompany[companyName].push({
        companyName: companyName,
        jobRole: question.jobRole.trim(),
        experienceLevel: question.experienceLevel,
        difficultyLevel: question.difficultyLevel,
        questionType: question.questionType,
        questionText: question.questionText.trim(),
        expectedAnswer: question.expectedAnswer.trim(),
        keywords: Array.isArray(question.keywords) ? question.keywords : [],
        createdAt: question.createdAt
          ? new Date(question.createdAt)
          : new Date(),
        updatedAt: new Date(),
      });
    });

    // Process each company
    const results = [];
    for (const companyName in questionsByCompany) {
      const companyQuestions = questionsByCompany[companyName];

      // Get or create model for this company
      const CompanyModel = CompanyQuestionModelFactory.getModel(companyName);

      // Insert questions
      const savedQuestions = await CompanyModel.insertMany(companyQuestions, {
        ordered: false, // Continue inserting even if some fail
      });

      results.push({
        companyName,
        collectionName:
          CompanyQuestionModelFactory.sanitizeCollectionName(companyName),
        count: savedQuestions.length,
      });

      logger.info(
        `Uploaded ${savedQuestions.length} questions for company: ${companyName}`
      );
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${validQuestions.length} question(s) across ${results.length} company(s)`,
      data: {
        totalQuestions: validQuestions.length,
        companies: results,
      },
    });
  } catch (error) {
    logger.error("Error uploading company questions:", error);

    // Handle duplicate key errors gracefully
    if (error.code === 11000 || error.name === "BulkWriteError") {
      return res.status(200).json({
        success: true,
        message: "Some questions were already present (skipped duplicates)",
        data: {
          totalQuestions: validQuestions?.length || 0,
          companies: [],
        },
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to upload company questions",
      error: error.message,
    });
  }
};

module.exports = uploadCompanyQuestions;
