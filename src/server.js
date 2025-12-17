const app = require("./app");
const logger = require("./utils/logger");
const http = require("http");
const { setupWebSocket } = require("./config/websocket");

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "localhost";

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception! Shutting down...");
  logger.error("Error details:", {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });
  console.error("Full error object:", err);
  // Give time for logs to be written
  setTimeout(() => process.exit(1), 100);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection! Shutting down...");
  logger.error("Error details:", {
    reason,
    promise,
  });
  // Give time for logs to be written
  setTimeout(() => process.exit(1), 100);
});

// Create HTTP server
const server = http.createServer(app);

// Setup WebSocket
const io = setupWebSocket(server);
logger.info("WebSocket server initialized");

// Start server
server.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Health check: http://${HOST}:${PORT}/health`);
  logger.info("WebSocket enabled on port " + PORT);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

module.exports = server;
