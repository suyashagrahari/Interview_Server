const Interview = require("../../models/Interview");

class InterviewTimerService {
  constructor(io) {
    this.io = io;
    this.activeTimers = new Map(); // interviewId -> intervalId
  }

  /**
   * Start timer for an interview
   */
  startTimer(interviewId, socket) {
    // Clear existing timer if any
    this.stopTimer(interviewId);

    console.log(`⏱️  Starting timer for interview: ${interviewId}`);

    // Update time every second
    const intervalId = setInterval(async () => {
      try {
        const interview = await Interview.findById(interviewId);

        if (!interview || interview.status !== "in_progress") {
          console.log(`⏹️  Stopping timer for interview ${interviewId} - not active`);
          this.stopTimer(interviewId);
          return;
        }

        // Calculate time remaining
        const startTime = new Date(interview.startedAt);
        const now = new Date();
        const timeElapsed = Math.floor((now - startTime) / 1000); // seconds
        const totalDuration = 45 * 60; // 45 minutes in seconds
        const timeRemaining = Math.max(0, totalDuration - timeElapsed);

        // Update in database
        interview.timeRemaining = timeRemaining;
        interview.lastTimeUpdate = now;
        await interview.save();

        // Emit to client via WebSocket
        this.io.to(`interview-${interviewId}`).emit("timer:update", {
          interviewId,
          timeRemaining,
          timeElapsed,
          isExpired: timeRemaining <= 0,
        });

        // Auto-end if expired
        if (timeRemaining <= 0) {
          console.log(`⏱️  Interview ${interviewId} time expired - auto-ending`);

          interview.status = "completed";
          interview.completedAt = now;
          await interview.save();

          this.io.to(`interview-${interviewId}`).emit("interview:expired", {
            interviewId,
            message: "Interview time has expired",
          });

          this.stopTimer(interviewId);
        }
      } catch (error) {
        console.error(`Error updating timer for interview ${interviewId}:`, error);
        this.stopTimer(interviewId);
      }
    }, 1000); // Update every second

    this.activeTimers.set(interviewId, intervalId);
  }

  /**
   * Stop timer for an interview
   */
  stopTimer(interviewId) {
    const intervalId = this.activeTimers.get(interviewId);

    if (intervalId) {
      clearInterval(intervalId);
      this.activeTimers.delete(interviewId);
      console.log(`⏹️  Stopped timer for interview: ${interviewId}`);
    }
  }

  /**
   * Get current time remaining for an interview
   */
  async getTimeRemaining(interviewId) {
    try {
      const interview = await Interview.findById(interviewId);

      if (!interview || !interview.startedAt) {
        return { success: false, timeRemaining: 0 };
      }

      const startTime = new Date(interview.startedAt);
      const now = new Date();
      const timeElapsed = Math.floor((now - startTime) / 1000);
      const totalDuration = 45 * 60;
      const timeRemaining = Math.max(0, totalDuration - timeElapsed);

      return {
        success: true,
        timeRemaining,
        timeElapsed,
        isExpired: timeRemaining <= 0,
      };
    } catch (error) {
      console.error("Error getting time remaining:", error);
      return { success: false, timeRemaining: 0 };
    }
  }

  /**
   * Stop all active timers (useful for server shutdown)
   */
  stopAllTimers() {
    console.log(`⏹️  Stopping all active timers (${this.activeTimers.size} total)`);

    for (const [interviewId, intervalId] of this.activeTimers.entries()) {
      clearInterval(intervalId);
      console.log(`⏹️  Stopped timer for interview: ${interviewId}`);
    }

    this.activeTimers.clear();
  }
}

module.exports = InterviewTimerService;
