const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

/**
 * Parse DOCX file and extract text content
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<{text: string, success: boolean, errors: string[]}>}
 */
const parseDocx = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();

    if (!text) {
      return {
        text: "",
        success: false,
        errors: ["No text content found in the DOCX file"],
      };
    }

    return {
      text,
      success: true,
      errors: result.messages
        .filter((msg) => msg.type === "error")
        .map((msg) => msg.message),
    };
  } catch (error) {
    return {
      text: "",
      success: false,
      errors: [`Failed to parse DOCX file: ${error.message}`],
    };
  }
};

/**
 * Parse PDF file and extract text content
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{text: string, success: boolean, errors: string[]}>}
 */
const parsePdf = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text.trim();

    if (!text) {
      return {
        text: "",
        success: false,
        errors: ["No text content found in the PDF file"],
      };
    }

    return {
      text,
      success: true,
      errors: [],
    };
  } catch (error) {
    return {
      text: "",
      success: false,
      errors: [`Failed to parse PDF file: ${error.message}`],
    };
  }
};

/**
 * Parse DOC file and extract text content
 * Note: DOC files are more complex and may require additional libraries
 * For now, we'll return an error suggesting to convert to DOCX
 * @param {string} filePath - Path to the DOC file
 * @returns {Promise<{text: string, success: boolean, errors: string[]}>}
 */
const parseDoc = async (filePath) => {
  return {
    text: "",
    success: false,
    errors: [
      "DOC files are not supported. Please convert your file to DOCX format and try again.",
    ],
  };
};

/**
 * Get file extension from file path
 * @param {string} filePath - Path to the file
 * @returns {string} - File extension in lowercase
 */
const getFileExtension = (filePath) => {
  return path.extname(filePath).toLowerCase().substring(1);
};

/**
 * Parse file based on its extension
 * @param {string} filePath - Path to the file
 * @returns {Promise<{text: string, success: boolean, errors: string[]}>}
 */
const parseFile = async (filePath) => {
  const extension = getFileExtension(filePath);

  switch (extension) {
    case "docx":
      return await parseDocx(filePath);
    case "pdf":
      return await parsePdf(filePath);
    case "doc":
      return await parseDoc(filePath);
    default:
      return {
        text: "",
        success: false,
        errors: [
          `Unsupported file type: ${extension}. Supported types are PDF, DOC, and DOCX.`,
        ],
      };
  }
};

/**
 * Validate file before parsing
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
const validateFile = (file) => {
  const errors = [];

  // Check if file exists
  if (!file) {
    errors.push("No file provided");
    return { valid: false, errors };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push(
      `File size (${(file.size / 1024 / 1024).toFixed(
        2
      )}MB) exceeds maximum limit of 5MB`
    );
  }

  // Check file type
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(
      `Invalid file type: ${file.mimetype}. Allowed types are PDF, DOC, and DOCX.`
    );
  }

  // Check file extension
  const extension = getFileExtension(file.originalname);
  const allowedExtensions = ["pdf", "doc", "docx"];
  if (!allowedExtensions.includes(extension)) {
    errors.push(
      `Invalid file extension: ${extension}. Allowed extensions are .pdf, .doc, and .docx.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  parseFile,
  parseDocx,
  parsePdf,
  parseDoc,
  validateFile,
  getFileExtension,
};
