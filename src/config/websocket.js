const { Server } = require("socket.io");
const InterviewTimerService = require("../services/websocket/interviewTimer");

let io;
let timerService;

const setupWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize timer service
  timerService = new InterviewTimerService(io);

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join interview room
    socket.on("interview:join", ({ interviewId, userId }) => {
      console.log(`📥 User ${userId} joining interview ${interviewId}`);
      socket.join(`interview-${interviewId}`);
      socket.join(`user-${userId}`);

      // Start timer for this interview
      timerService.startTimer(interviewId, socket);

      socket.emit("interview:joined", {
        interviewId,
        message: "Successfully joined interview room",
      });
    });

    // Leave interview room
    socket.on("interview:leave", ({ interviewId }) => {
      console.log(`📤 Leaving interview ${interviewId}`);
      socket.leave(`interview-${interviewId}`);

      // Stop timer if no one else in the room
      const room = io.sockets.adapter.rooms.get(`interview-${interviewId}`);
      if (!room || room.size === 0) {
        timerService.stopTimer(interviewId);
      }
    });

    // Get current time remaining
    socket.on("timer:get", async ({ interviewId }) => {
      const result = await timerService.getTimeRemaining(interviewId);
      socket.emit("timer:current", {
        interviewId,
        ...result,
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("⏹️  SIGTERM received, stopping all timers...");
    timerService.stopAllTimers();
    io.close();
  });

  process.on("SIGINT", () => {
    console.log("⏹️  SIGINT received, stopping all timers...");
    timerService.stopAllTimers();
    io.close();
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

const getTimerService = () => {
  if (!timerService) {
    throw new Error("Timer service not initialized!");
  }
  return timerService;
};

module.exports = {
  setupWebSocket,
  getIO,
  getTimerService,
};
