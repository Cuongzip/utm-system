import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.resolve(__dirname, "../src/generated");
if (fs.existsSync(generatedDir)) {
    const files = fs.readdirSync(generatedDir).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
        const filePath = path.join(generatedDir, file);
        let content = fs.readFileSync(filePath, "utf8");
        content = content.replace(
            /export const (\w+)Default = "([0-9.]+)";/g,
            "export const $1Default = $2;"
        );
        fs.writeFileSync(filePath, content, "utf8");
    }
}
