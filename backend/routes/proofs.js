const express = require("express");
const router = express.Router();
const {
  submitProof,
  getProofs,
  generateQuiz,
  upload,
} = require("../controllers/proofController");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);
router.post("/", submitProof);
router.get("/", getProofs);
router.post("/generate-quiz", generateQuiz);

module.exports = router;
