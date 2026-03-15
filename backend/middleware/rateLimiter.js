const rateLimit = require("express-rate-limit");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Bahut zyada requests! 15 minute baad try karo.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Bahut zyada login attempts! 15 minute baad try karo.",
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: "AI requests limit ho gayi! 1 hour baad try karo.",
  },
});

module.exports = { generalLimiter, authLimiter, aiLimiter };
