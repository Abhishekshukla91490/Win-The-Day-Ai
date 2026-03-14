const express = require("express");
const router = express.Router();
const { createPlan, getPlans } = require("../controllers/planController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/", createPlan);
router.get("/", getPlans);

module.exports = router;
