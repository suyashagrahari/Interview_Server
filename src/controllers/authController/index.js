// Main auth controller - exports all modular functions
const signup = require("./signup");
const signin = require("./signin");
const googleAuth = require("./googleAuth");
const refreshToken = require("./refreshToken");
const getProfile = require("./getProfile");
const updateProfile = require("./updateProfile");
const logout = require("./logout");
const logoutAll = require("./logoutAll");

module.exports = {
  signup,
  signin,
  googleAuth,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
  logoutAll,
};

