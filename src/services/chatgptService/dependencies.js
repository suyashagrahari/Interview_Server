// Shared dependencies for all ChatGPT service functions
const axios = require("axios");
const logger = require("../../utils/logger");
require("dotenv").config();

// Configuration
const config = {
  apiKey: process.env.CHATGPT_API_KEY,
  baseURL: "https://api.openai.com/v1/chat/completions",
  model: "gpt-3.5-turbo",
};

module.exports = {
  axios,
  logger,
  config,
};



