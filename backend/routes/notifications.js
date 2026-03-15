const express = require("express");
const router = express.Router();
const { getNotifications } = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/", getNotifications);

module.exports = router;
