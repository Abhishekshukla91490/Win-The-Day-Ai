const express = require("express");
const router = express.Router();
const { generatePlan } = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/generate-plan", generatePlan);

module.exports = router;
