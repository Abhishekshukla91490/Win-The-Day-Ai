const express = require("express");
const router = express.Router();
const { submitProof, getProofs } = require("../controllers/proofController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/", submitProof);
router.get("/", getProofs);

module.exports = router;
