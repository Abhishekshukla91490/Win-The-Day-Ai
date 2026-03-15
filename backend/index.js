const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const planRoutes = require("./routes/plans");
const proofRoutes = require("./routes/proofs");
const aiRoutes = require("./routes/ai");
const scoreRoutes = require("./routes/scores");
const streakRoutes = require("./routes/streaks");
const progressRoutes = require("./routes/progress");
const adminRoutes = require("./routes/admin");
const leaderboardRoutes = require("./routes/leaderboard");
const notificationRoutes = require("./routes/notifications");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");
const {
  generalLimiter,
  authLimiter,
  aiLimiter,
} = require("./middleware/rateLimiter");
const {
  securityMiddleware,
  compressionMiddleware,
} = require("./middleware/security");

const app = express();

// Security & Performance
app.use(securityMiddleware);
app.use(compressionMiddleware);
app.use(cors());
app.use(express.json());

// Static files (Web Dashboard)
app.use(express.static(path.join(__dirname, "public")));

// Rate limiting
app.use(generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/ai", aiLimiter);

app.get("/api", (req, res) => {
  res.json({
    message: "🚀 Win The Day API is running!",
    version: "1.0.0",
    status: "active",
    endpoints: {
      auth: "/api/auth",
      tasks: "/api/tasks",
      plans: "/api/plans",
      proofs: "/api/proofs",
      ai: "/api/ai",
      scores: "/api/scores",
      streaks: "/api/streaks",
      progress: "/api/progress",
      admin: "/api/admin",
      leaderboard: "/api/leaderboard",
      notifications: "/api/notifications",
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/proofs", proofRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/streaks", streakRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
