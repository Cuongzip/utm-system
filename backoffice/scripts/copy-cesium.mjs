import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const cesiumSource = path.join(rootDir, "node_modules", "cesium", "Build", "Cesium");
const cesiumDest = path.join(rootDir, "public", "cesium");

if (!fs.existsSync(cesiumSource)) {
  console.warn("Cesium build folder not found at:", cesiumSource);
  process.exit(0);
}

fs.mkdirSync(cesiumDest, { recursive: true });

const foldersToCopy = ["Assets", "ThirdParty", "Widgets", "Workers"];

for (const folder of foldersToCopy) {
  const src = path.join(cesiumSource, folder);
  const dest = path.join(cesiumDest, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`Copied ${folder} to public/cesium/${folder}`);
  }
}

console.log("Cesium static assets copied successfully.");
