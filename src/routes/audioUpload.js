const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const {
  sendSuccessResponse,
  sendBadRequestError,
  sendInternalServerError,
} = require("../utils/responseHelpers");

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const audioDir = path.join(__dirname, "../../uploads/audio");
    try {
      await fs.mkdir(audioDir, { recursive: true });
      cb(null, audioDir);
    } catch (error) {
      cb(error, audioDir);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const ext = path.extname(file.originalname) || ".mp3";
    const filename = `audio-${timestamp}-${uniqueId}${ext}`;
    cb(null, filename);
  },
});

// File filter to only accept audio files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/webm",
    "audio/ogg",
    "audio/m4a",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Only audio files are allowed. Received: ${file.mimetype}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

/**
 * Upload audio file endpoint
 * POST /api/audio/upload
 * @route POST /api/audio/upload
 * @desc Upload an audio file (MP3, WAV, etc.) and save it to uploads/audio folder
 * @access Public (for testing)
 */
router.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return sendBadRequestError(
        res,
        "No audio file provided. Please upload a file with field name 'audio'"
      );
    }

    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/audio/${req.file.filename}`,
    };

    logger.info(
      `✅ Audio file uploaded successfully: ${fileInfo.filename} (${fileInfo.size} bytes)`
    );
    logger.info(`📁 File saved at: ${fileInfo.path}`);

    return sendSuccessResponse(
      res,
      200,
      "Audio file uploaded successfully",
      fileInfo
    );
  } catch (error) {
    logger.error("Error uploading audio file:", error);

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return sendBadRequestError(res, "File too large. Maximum size is 50MB");
      }
      return sendBadRequestError(res, `Upload error: ${error.message}`);
    }

    return sendInternalServerError(
      res,
      error.message || "Failed to upload audio file"
    );
  }
});

/**
 * Upload audio file and transcribe using Groq
 * POST /api/audio/upload-and-transcribe
 * @route POST /api/audio/upload-and-transcribe
 * @desc Upload audio file, save it, and transcribe it using Groq API
 * @access Public (for testing)
 */
router.post(
  "/upload-and-transcribe",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return sendBadRequestError(
          res,
          "No audio file provided. Please upload a file with field name 'audio'"
        );
      }

      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/audio/${req.file.filename}`,
      };

      logger.info(
        `✅ Audio file uploaded: ${fileInfo.filename} (${fileInfo.size} bytes)`
      );

      // Transcribe the audio using Groq
      const groqTranscriptionService = require("../services/groqTranscriptionService");
      logger.info("🎤 Transcribing audio with Groq...");

      const transcriptionResult =
        await groqTranscriptionService.transcribeAudio(req.file.path);

      if (transcriptionResult.success) {
        logger.info(
          `✅ Transcription successful: "${transcriptionResult.text.substring(
            0,
            100
          )}${transcriptionResult.text.length > 100 ? "..." : ""}"`
        );
        console.log(
          `📝 [GROQ] Text transcribed from audio: "${transcriptionResult.text}"`
        );
        console.log(`📝 [GROQ] This text came from Groq API transcription`);

        return sendSuccessResponse(
          res,
          200,
          "Audio uploaded and transcribed successfully",
          {
            file: fileInfo,
            transcription: {
              text: transcriptionResult.text,
              language: transcriptionResult.language,
              duration: transcriptionResult.duration,
              source: "groq",
            },
          }
        );
      } else {
        logger.error(`❌ Transcription failed: ${transcriptionResult.message}`);
        return sendSuccessResponse(
          res,
          200,
          "Audio uploaded but transcription failed",
          {
            file: fileInfo,
            transcription: {
              success: false,
              message: transcriptionResult.message,
            },
          }
        );
      }
    } catch (error) {
      logger.error("Error uploading and transcribing audio:", error);

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return sendBadRequestError(
            res,
            "File too large. Maximum size is 50MB"
          );
        }
        return sendBadRequestError(res, `Upload error: ${error.message}`);
      }

      return sendInternalServerError(
        res,
        error.message || "Failed to upload and transcribe audio file"
      );
    }
  }
);

/**
 * List all audio files
 * GET /api/audio/list
 * @route GET /api/audio/list
 * @desc Get list of all uploaded audio files
 * @access Public (for testing)
 */
router.get("/list", async (req, res) => {
  try {
    const audioDir = path.join(__dirname, "../../uploads/audio");

    try {
      const files = await fs.readdir(audioDir);
      const fileList = [];

      for (const file of files) {
        const filePath = path.join(audioDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          fileList.push({
            filename: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            url: `/uploads/audio/${file}`,
          });
        }
      }

      // Sort by creation time (newest first)
      fileList.sort((a, b) => b.createdAt - a.createdAt);

      return sendSuccessResponse(
        res,
        200,
        `Found ${fileList.length} audio file(s)`,
        { files: fileList }
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        return sendSuccessResponse(
          res,
          200,
          "Audio directory does not exist yet",
          { files: [] }
        );
      }
      throw error;
    }
  } catch (error) {
    logger.error("Error listing audio files:", error);
    return sendInternalServerError(res, "Failed to list audio files");
  }
});

module.exports = router;
