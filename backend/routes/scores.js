const express = require("express");
const router = express.Router();
const { updateScore, getScore } = require("../controllers/scoreController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/update", updateScore);
router.get("/", getScore);

module.exports = router;
