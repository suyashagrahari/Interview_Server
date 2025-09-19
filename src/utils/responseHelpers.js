/**
 * Response helper utilities for consistent API responses
 */

/**
 * Create a success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} JSON response
 */
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Create an error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} errors - Additional error details
 * @returns {Object} JSON response
 */
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send authentication required error
 * @param {Object} res - Express response object
 * @returns {Object} JSON response
 */
const sendAuthRequiredError = (res) => {
  return sendErrorResponse(res, 401, "Authentication required");
};

/**
 * Send validation error
 * @param {Object} res - Express response object
 * @param {Array} errors - Validation errors
 * @returns {Object} JSON response
 */
const sendValidationError = (res, errors) => {
  return sendErrorResponse(res, 400, "Validation failed", errors);
};

/**
 * Send not found error
 * @param {Object} res - Express response object
 * @param {string} resource - Resource that was not found
 * @returns {Object} JSON response
 */
const sendNotFoundError = (res, resource = "Resource") => {
  return sendErrorResponse(res, 404, `${resource} not found`);
};

/**
 * Send conflict error
 * @param {Object} res - Express response object
 * @param {string} message - Conflict message
 * @param {Object} data - Additional data
 * @returns {Object} JSON response
 */
const sendConflictError = (res, message, data = null) => {
  return sendErrorResponse(res, 409, message, data);
};

/**
 * Send internal server error
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const sendInternalServerError = (res, message = "Internal server error") => {
  return sendErrorResponse(res, 500, message);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @returns {Object} JSON response
 */
const sendPaginatedResponse = (res, items, pagination, message) => {
  return sendSuccessResponse(res, 200, message, {
    items,
    pagination,
  });
};

/**
 * Send created response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Created resource data
 * @returns {Object} JSON response
 */
const sendCreatedResponse = (res, message, data) => {
  return sendSuccessResponse(res, 201, message, data);
};

/**
 * Send no content response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @returns {Object} JSON response
 */
const sendNoContentResponse = (res, message) => {
  return sendSuccessResponse(res, 204, message);
};

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  sendAuthRequiredError,
  sendValidationError,
  sendNotFoundError,
  sendConflictError,
  sendInternalServerError,
  sendPaginatedResponse,
  sendCreatedResponse,
  sendNoContentResponse,
};
