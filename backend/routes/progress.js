const express = require("express");
const router = express.Router();
const { getProgress } = require("../controllers/progressController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/", getProgress);

module.exports = router;
