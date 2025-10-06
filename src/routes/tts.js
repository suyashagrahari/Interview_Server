const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  generateTTS,
  generateTTSStream,
  cleanupOldAudioFiles,
} = require("../controllers/ttsController");

/**
 * @route   POST /api/tts/generate
 * @desc    Generate text-to-speech audio file
 * @access  Private
 */
router.post("/generate", authenticateToken, generateTTS);

/**
 * @route   POST /api/tts/generate-stream
 * @desc    Generate text-to-speech with base64 audio for streaming
 * @access  Private
 */
router.post("/generate-stream", authenticateToken, generateTTSStream);

/**
 * @route   DELETE /api/tts/cleanup
 * @desc    Clean up old audio files
 * @access  Private (Admin only - add admin middleware if needed)
 */
router.delete("/cleanup", authenticateToken, cleanupOldAudioFiles);

module.exports = router;
