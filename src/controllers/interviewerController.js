const Interviewer = require("../models/Interviewer");
const logger = require("../utils/logger");

// Get all active interviewers
const getAllInterviewers = async (req, res) => {
  try {
    logger.info("Fetching all active interviewers");

    const interviewers = await Interviewer.find({ isActive: true })
      .select("-__v")
      .sort({ rating: -1, createdAt: -1 });

    logger.info(`Found ${interviewers.length} active interviewers`);

    res.status(200).json({
      success: true,
      message: "Interviewers fetched successfully",
      data: interviewers,
      count: interviewers.length,
    });
  } catch (error) {
    logger.error("Error fetching interviewers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interviewers",
      error: error.message,
    });
  }
};

// Get interviewer by ID
const getInterviewerById = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching interviewer with ID: ${id}`);

    const interviewer = await Interviewer.findOne({
      _id: id,
      isActive: true,
    }).select("-__v");

    if (!interviewer) {
      logger.warn(`Interviewer not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Interviewer not found",
      });
    }

    logger.info(`Found interviewer: ${interviewer.name}`);

    res.status(200).json({
      success: true,
      message: "Interviewer fetched successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error fetching interviewer by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch interviewer",
      error: error.message,
    });
  }
};

// Create new interviewer (admin only)
const createInterviewer = async (req, res) => {
  try {
    const interviewerData = req.body;
    logger.info("Creating new interviewer:", interviewerData.name);

    const interviewer = new Interviewer(interviewerData);
    await interviewer.save();

    logger.info(`Interviewer created successfully: ${interviewer.name}`);

    res.status(201).json({
      success: true,
      message: "Interviewer created successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error creating interviewer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create interviewer",
      error: error.message,
    });
  }
};

// Update interviewer (admin only)
const updateInterviewer = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    logger.info(`Updating interviewer with ID: ${id}`);

    const interviewer = await Interviewer.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!interviewer) {
      logger.warn(`Interviewer not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Interviewer not found",
      });
    }

    logger.info(`Interviewer updated successfully: ${interviewer.name}`);

    res.status(200).json({
      success: true,
      message: "Interviewer updated successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error updating interviewer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update interviewer",
      error: error.message,
    });
  }
};

// Delete interviewer (admin only)
const deleteInterviewer = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting interviewer with ID: ${id}`);

    const interviewer = await Interviewer.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!interviewer) {
      logger.warn(`Interviewer not found with ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Interviewer not found",
      });
    }

    logger.info(`Interviewer deleted successfully: ${interviewer.name}`);

    res.status(200).json({
      success: true,
      message: "Interviewer deleted successfully",
      data: interviewer,
    });
  } catch (error) {
    logger.error("Error deleting interviewer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete interviewer",
      error: error.message,
    });
  }
};

module.exports = {
  getAllInterviewers,
  getInterviewerById,
  createInterviewer,
  updateInterviewer,
  deleteInterviewer,
};
