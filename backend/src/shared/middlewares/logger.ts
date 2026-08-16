import fs from "fs";
import path from "path";
import morgan from "morgan";

const logDir = path.join(import.meta.dirname, "../../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const accessLogStream = fs.createWriteStream(path.join(logDir, "access.log"), {
  flags: "a",
});

export const requestLogger = morgan("combined", { stream: accessLogStream });
