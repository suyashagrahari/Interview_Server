const ttsService = require("../../services/ttsService");
const logger = require("../../utils/logger");
const { sendSuccessResponse, sendBadRequestError, sendInternalServerError } = require("../../utils/responseHelpers");

/**
 * Generate text-to-speech audio
 * POST /api/tts/generate
 */
const generateTTS = async (req, res) => {
  try {
    const { text, fileName, outputDir } = req.body;

    // Validate input
    if (!text || !text.trim()) {
      return sendBadRequestError(res, "Text is required for TTS generation");
    }

    // Generate speech
    const result = await ttsService.generateSpeech(
      text,
      fileName,
      outputDir || "voice"
    );

    if (!result.success) {
      return sendInternalServerError(res, result.message || "Failed to generate speech");
    }

    return sendSuccessResponse(res, "Speech generated successfully", {
      fileName: result.fileName,
      url: result.url,
      filePath: result.relativePath,
    });
  } catch (error) {
    logger.error("Error in generateTTS controller:", error);
    return sendInternalServerError(res, "Internal server error");
  }
};

/**
 * Generate TTS and return base64 audio for streaming
 * POST /api/tts/generate-stream
 */
const generateTTSStream = async (req, res) => {
  try {
    const { text, fileName } = req.body;

    // Validate input
    if (!text || !text.trim()) {
      return sendBadRequestError(res, "Text is required for TTS generation");
    }

    // Generate speech with stream
    const result = await ttsService.generateSpeechStream(text, fileName);

    if (!result.success) {
      return sendInternalServerError(res, result.message || "Failed to generate speech stream");
    }

    return sendSuccessResponse(res, "Speech stream generated successfully", {
      fileName: result.fileName,
      url: result.url,
      audioBase64: result.audioBase64,
      mimeType: "audio/mpeg",
    });
  } catch (error) {
    logger.error("Error in generateTTSStream controller:", error);
    return sendInternalServerError(res, "Internal server error");
  }
};

/**
 * Clean up old audio files
 * DELETE /api/tts/cleanup
 */
const cleanupOldAudioFiles = async (req, res) => {
  try {
    const { hoursOld = 24, directory = "voice" } = req.query;

    const result = await ttsService.cleanupOldFiles(
      parseInt(hoursOld),
      directory
    );

    if (!result.success) {
      return sendInternalServerError(res, "Failed to cleanup audio files");
    }

    return sendSuccessResponse(res, "Audio files cleaned up successfully", {
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error("Error in cleanupOldAudioFiles controller:", error);
    return sendInternalServerError(res, "Internal server error");
  }
};

module.exports = {
  generateTTS,
  generateTTSStream,
  cleanupOldAudioFiles,
};
