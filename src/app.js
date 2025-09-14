require("express-async-errors");
require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");

// Import middleware
const {
  securityHeaders,
  corsOptions,
  generalLimiter,
  sanitizeData,
  requestLogger,
  trustProxy,
} = require("./middleware/security");
const cors = require("cors");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const resumeRoutes = require("./routes/resume");
const interviewRoutes = require("./routes/interview");

// Import database
const database = require("./config/database");
const logger = require("./utils/logger");

// Create Express app
const app = express();

// Trust proxy (for accurate IP addresses behind reverse proxy)
app.use(trustProxy);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Request logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

app.use(requestLogger);

// Data sanitization
app.use(sanitizeData);

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/interview", interviewRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Interview Platform API",
    version: "1.0.0",
    documentation: "/api/docs",
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Connect to database
const initializeDatabase = async () => {
  try {
    await database.connect();
    logger.info("Database connection established successfully");
  } catch (error) {
    logger.error("Failed to connect to database:", error);
    process.exit(1);
  }
};

// Initialize database connection
initializeDatabase();

module.exports = app;
