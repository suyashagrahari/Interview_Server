const { Server } = require("socket.io");
const InterviewTimerService = require("../services/websocket/interviewTimer");
const InterviewHandlerService = require("../services/websocket/interviewHandler");

let io;
let timerService;
let interviewHandler;

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

  // Initialize services
  timerService = new InterviewTimerService(io);
  interviewHandler = new InterviewHandlerService(io);

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join interview room
    socket.on("interview:join", ({ interviewId, userId }) => {
      console.log(`📥 User ${userId} joining interview ${interviewId}`);
      socket.join(`interview-${interviewId}`);
      socket.join(`user-${userId}`);

      // Register connection in interview handler
      interviewHandler.registerConnection(userId, socket.id, interviewId);

      // Start timer for this interview
      timerService.startTimer(interviewId, socket);

      socket.emit("interview:joined", {
        interviewId,
        message: "Successfully joined interview room",
      });
    });

    // Generate first question (WebSocket)
    socket.on("question:generate-first", async ({ interviewId, userId }) => {
      await interviewHandler.handleGenerateFirstQuestion(socket, {
        interviewId,
        userId,
      });
    });

    // Submit answer (WebSocket)
    socket.on("answer:submit", async ({
      interviewId,
      questionId,
      userId,
      answer,
      proctoringData,
    }) => {
      await interviewHandler.handleSubmitAnswer(socket, {
        interviewId,
        questionId,
        userId,
        answer,
        proctoringData,
      });
    });

    // Handle reconnection
    socket.on("interview:reconnect", async ({ interviewId, userId }) => {
      await interviewHandler.handleReconnection(socket, {
        interviewId,
        userId,
      });
    });

    // Update proctoring data (tab switches, copy/paste, etc.)
    socket.on("proctoring:update", async ({ interviewId, userId, proctoringData }) => {
      await interviewHandler.handleProctoringUpdate(socket, {
        interviewId,
        userId,
        proctoringData,
      });
    });

    // Get proctoring data
    socket.on("proctoring:get", async ({ interviewId, userId }) => {
      await interviewHandler.handleGetProctoringData(socket, {
        interviewId,
        userId,
      });
    });

    // Leave interview room
    socket.on("interview:leave", ({ interviewId, userId }) => {
      console.log(`📤 User ${userId} leaving interview ${interviewId}`);
      socket.leave(`interview-${interviewId}`);
      socket.leave(`user-${userId}`);

      // Unregister connection
      interviewHandler.unregisterConnection(userId);

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
      // Note: We don't unregister here to allow reconnection
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
