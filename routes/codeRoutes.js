import express from "express";
import { executeCodeController } from "../controllers/codeController.js";

const router = express.Router();

// POST /run - Execute user-submitted code
router.post("/", executeCodeController);

export default router;
