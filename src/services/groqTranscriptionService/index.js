const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");

/**
 * Groq Transcription Service
 * Converts audio files to text using Groq API
 */
class GroqTranscriptionService {
  constructor() {
    this.apiKey =
      process.env.GROQ_API_KEY ||
      "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";
    this.apiUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
    this.model = "whisper-large-v3-turbo";
  }

  /**
   * Transcribe audio file to text using Groq API
   * @param {string} audioFilePath - Path to the audio file (MP3, WAV, etc.)
   * @returns {Promise<Object>} Object with success, text, and metadata
   */
  async transcribeAudio(audioFilePath) {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      logger.info(`🎤 Transcribing audio file: ${audioFilePath}`);

      // Create form data
      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioFilePath));
      formData.append("model", this.model);
      formData.append("temperature", "0");
      formData.append("response_format", "verbose_json");

      // Make request to Groq API
      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 seconds timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const transcriptionText =
        response.data.text || response.data.transcription || "";

      logger.info(
        `✅ Transcription successful (from Groq): "${transcriptionText.substring(
          0,
          100
        )}${transcriptionText.length > 100 ? "..." : ""}"`
      );
      logger.info(`📝 Text came from Groq API - Model: ${this.model}`);

      return {
        success: true,
        text: transcriptionText,
        language: response.data.language || "unknown",
        duration: response.data.duration || null,
        source: "groq",
      };
    } catch (error) {
      logger.error("Error transcribing audio with Groq:", {
        message: error.message,
        code: error.code,
        file: audioFilePath,
      });

      if (error.response) {
        logger.error(
          `Groq API error: ${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        );
        return {
          success: false,
          message: `Groq API error: ${error.response.status} - ${
            error.response.data?.error?.message || "Unknown error"
          }`,
          error: error.response.data,
        };
      }

      return {
        success: false,
        message: error.message || "Failed to transcribe audio",
        error: error.code || "UNKNOWN_ERROR",
      };
    }
  }

  /**
   * Transcribe audio buffer to text
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} fileName - Temporary filename for the buffer
   * @returns {Promise<Object>} Object with success, text, and metadata
   */
  async transcribeAudioBuffer(audioBuffer, fileName = "temp-audio.mp3") {
    const tempDir = path.join(__dirname, "../../../uploads/temp");
    const tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);

    try {
      // Ensure temp directory exists
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Write buffer to temporary file
      await fs.promises.writeFile(tempFilePath, audioBuffer);

      // Transcribe
      const result = await this.transcribeAudio(tempFilePath);

      // Clean up temporary file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (cleanupError) {
        logger.warn(
          `Failed to cleanup temp file: ${tempFilePath}`,
          cleanupError
        );
      }

      return result;
    } catch (error) {
      // Clean up temporary file on error
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        message: error.message || "Failed to transcribe audio buffer",
        error: error.code || "UNKNOWN_ERROR",
      };
    }
  }
}

module.exports = new GroqTranscriptionService();
