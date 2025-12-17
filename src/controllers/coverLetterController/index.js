const { buildCoverLetterHtml } = require("../../services/coverLetterService");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { parseFile } = require("../../utils/fileParser");

const validateText = (value, name, min = 20, max = 60000) => {
  if (!value || typeof value !== "string") {
    const err = new Error(`${name} is required`);
    err.statusCode = 400;
    throw err;
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    const err = new Error(`${name} must be at least ${min} characters`);
    err.statusCode = 400;
    throw err;
  }
  if (trimmed.length > max) {
    const err = new Error(`${name} exceeds maximum length`);
    err.statusCode = 400;
    throw err;
  }
  return trimmed;
};

exports.generateFromResume = async (req, res, next) => {
  try {
    const { resumeText, targetJobTitle, companyName } = req.body || {};
    const cleanedResume = validateText(resumeText, "resumeText");
    const html = await buildCoverLetterHtml({
      mode: "resume",
      resumeText: cleanedResume,
      jobDescription: undefined,
      targetJobTitle: targetJobTitle || "",
      companyName: companyName || "",
    });

    res.status(200).json({ success: true, mode: "resume", html });
  } catch (err) {
    next(err);
  }
};

exports.generateFromJd = async (req, res, next) => {
  try {
    const { jobDescription, targetJobTitle, companyName } = req.body || {};
    const cleanedJd = validateText(jobDescription, "jobDescription");
    const html = await buildCoverLetterHtml({
      mode: "jd",
      resumeText: undefined,
      jobDescription: cleanedJd,
      targetJobTitle: targetJobTitle || "",
      companyName: companyName || "",
    });

    res.status(200).json({ success: true, mode: "jd", html });
  } catch (err) {
    next(err);
  }
};

exports.generateFromBoth = async (req, res, next) => {
  try {
    const { resumeText, jobDescription, targetJobTitle, companyName } =
      req.body || {};
    const cleanedResume = validateText(resumeText, "resumeText");
    const cleanedJd = validateText(jobDescription, "jobDescription");
    const html = await buildCoverLetterHtml({
      mode: "both",
      resumeText: cleanedResume,
      jobDescription: cleanedJd,
      targetJobTitle: targetJobTitle || "",
      companyName: companyName || "",
    });

    res.status(200).json({ success: true, mode: "both", html });
  } catch (err) {
    next(err);
  }
};

// In-memory upload for quick text extraction (no DB save)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../../uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `cover-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Unsupported file type"), false);
};

exports.extractUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

exports.extractText = async (req, res, next) => {
  try {
    if (!req.file?.path) {
      const err = new Error("No file uploaded");
      err.statusCode = 400;
      throw err;
    }
    const result = await parseFile(req.file.path);
    try {
      fs.unlinkSync(req.file.path);
    } catch {}
    if (!result.success) {
      const err = new Error("Failed to parse file");
      err.statusCode = 400;
      err.details = result.errors;
      throw err;
    }
    res
      .status(200)
      .json({ success: true, text: result.text, length: result.text.length });
  } catch (err) {
    next(err);
  }
};
