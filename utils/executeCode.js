import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_DIR = path.join(__dirname, "../sandbox");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const MAX_FILES = 5;
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB per file

export async function runCode(language, code, inputData = "") {
  return new Promise((resolve) => {
    if (Buffer.byteLength(code, "utf-8") > MAX_FILE_SIZE) {
      return resolve({ success: false, error: "File size exceeds 1MB limit" });
    }

    enforceFileLimit(); // Ensure max 5 files in sandbox

    const filename = `code_${Date.now()}`;
    const filepath = path.join(TMP_DIR, filename);

    let command, args, extension, compiledFile;

    switch (language) {
      case "cpp":
        extension = ".cpp";
        const cppFilePath = filepath + extension;
        compiledFile = filepath + ".out";
        fs.writeFileSync(cppFilePath, code);

        command = "g++";
        args = [cppFilePath, "-o", compiledFile];

        const compileProcess = spawn(command, args);
        let compileError = "";
        compileProcess.stderr.on("data", (data) => {
          compileError += data.toString();
        });

        compileProcess.on("exit", (code) => {
          if (code !== 0) {
            cleanUpFiles([cppFilePath]);
            resolve({
              success: false,
              error: compileError || "Compilation failed",
            });
          } else {
            executeProcess(
              compiledFile,
              [],
              resolve,
              [cppFilePath, compiledFile],
              inputData
            );
          }
        });
        return;

      case "python":
        extension = ".py";
        const pyFilePath = filepath + extension;
        fs.writeFileSync(pyFilePath, code);

        command = "python3";
        args = [pyFilePath];

        executeProcess(command, args, resolve, [pyFilePath], inputData);
        return;

      case "java":
        extension = ".java";
        const javaFilePath = path.join(TMP_DIR, "Main.java"); // Ensure correct filename
        fs.writeFileSync(javaFilePath, code);

        command = "javac";
        args = [javaFilePath];

        const javaCompileProcess = spawn(command, args);
        let javaCompileError = "";
        javaCompileProcess.stderr.on("data", (data) => {
          javaCompileError += data.toString();
        });

        javaCompileProcess.on("exit", (code) => {
          if (code !== 0) {
            cleanUpFiles([javaFilePath]);
            resolve({
              success: false,
              error: javaCompileError || "Compilation failed",
            });
          } else {
            executeProcess(
              "java",
              ["-cp", TMP_DIR, "Main"],
              resolve,
              [javaFilePath, path.join(TMP_DIR, "Main.class")],
              inputData
            );
          }
        });
        return;

      default:
        return resolve({ success: false, error: "Unsupported language" });
    }
  });
}

// Function to execute compiled code and clean up files
function executeProcess(
  command,
  args,
  resolve,
  filesToDelete = [],
  inputData = ""
) {
  const process = spawn(command, args, {
    timeout: 5000, // Max execution time: 5 sec
    detached: true,
  });

  let output = "";
  let error = "";

  // Send input to the process
  if (inputData) {
    process.stdin.write(inputData + "\n");
    process.stdin.end();
  }

  process.stdout.on("data", (data) => {
    output += data.toString();
  });

  process.stderr.on("data", (data) => {
    error += data.toString();
  });

  process.on("exit", (code) => {
    cleanUpFiles(filesToDelete);

    if (code === 0) {
      resolve({ success: true, output });
    } else {
      resolve({ success: false, error: error || "Execution failed" });
    }
  });

  // Force kill if it exceeds time limit
  setTimeout(() => {
    process.kill();
    cleanUpFiles(filesToDelete);
    resolve({ success: false, error: "Execution timed out" });
  }, 5000);
}

// Function to delete temporary files
function cleanUpFiles(files) {
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        console.error(`Failed to delete file: ${file}`, err);
      }
    }
  });
}

// Function to enforce file limit (max 5 files)
function enforceFileLimit() {
  const files = fs
    .readdirSync(TMP_DIR)
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(TMP_DIR, file)).mtimeMs,
    }))
    .sort((a, b) => a.time - b.time); // Oldest files first

  while (files.length >= MAX_FILES) {
    const oldestFile = files.shift();
    try {
      fs.unlinkSync(path.join(TMP_DIR, oldestFile.name));
    } catch (err) {
      console.error(`Failed to delete old file: ${oldestFile.name}`, err);
    }
  }
}
