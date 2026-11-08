import { existsSync, mkdirSync } from "fs";
import path from "path";

export function uploadDir() {
  const dir =
    process.env.UPLOAD_DIR ||
    (existsSync("/data")
      ? "/data/avatars"
      : path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", "avatars"));
  mkdirSync(dir, { recursive: true });
  return dir;
}
