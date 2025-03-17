import { runCode } from "../utils/executeCode.js";

export const executeCodeController = async (req, res) => {
  const { language, code, inputData } = req.body; // Accept inputData from the request

  if (!language || !code) {
    return res.status(400).json({ error: "Language and code are required" });
  }

  try {
    const result = await runCode(language, code, inputData || ""); // Pass inputData to runCode
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
