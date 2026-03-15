const errorHandler = (err, req, res, next) => {
  console.error(`❌ Error: ${err.message}`);

  // Supabase errors
  if (err.code === "PGRST116") {
    return res.status(404).json({ error: "Data nahi mila" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json({ error: "Token expire ho gaya, dobara login karo" });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || "Kuch galat ho gaya, dobara try karo",
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    error: `Route '${req.originalUrl}' nahi mili`,
    available_routes: [
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "GET /api/tasks",
      "POST /api/tasks",
      "PUT /api/tasks/:id",
      "DELETE /api/tasks/:id",
      "POST /api/ai/generate-plan",
      "POST /api/proofs",
      "GET /api/proofs",
      "POST /api/scores/update",
      "GET /api/scores",
      "POST /api/streaks/update",
      "GET /api/streaks",
      "GET /api/progress",
    ],
  });
};

module.exports = { errorHandler, notFound };
