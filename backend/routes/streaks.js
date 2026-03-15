const express = require("express");
const router = express.Router();
const { updateStreak, getStreak } = require("../controllers/streakController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/update", updateStreak);
router.get("/", getStreak);

module.exports = router;
