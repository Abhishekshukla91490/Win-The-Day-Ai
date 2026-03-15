const express = require("express");
const router = express.Router();
const { getDashboard, getAllUsers } = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.get("/dashboard", getDashboard);
router.get("/users", getAllUsers);

module.exports = router;
