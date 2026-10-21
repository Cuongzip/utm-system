import fs from "node:fs";
import path from "node:path";

const generatedDir = path.resolve("src/generated");
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
