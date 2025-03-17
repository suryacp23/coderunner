import express from "express";
import cors from "cors";
import runRoute from "./routes/codeRoutes.js";

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(cors());

// Routes
app.use("/run", runRoute);
app.get("/", (req, res) => {
  res.json({ message: "hello world" });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "File size limit exceeded. Maximum allowed size is 1MB.",
    });
  }
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
