// The Genre Snob background visualizer for /play/.
// node make_play_bg.js [video folder]   (default ~/DMBuilds/DMSite-shots/bg)
//
// Copies the four silent videos as they are (they are already web encoded, with
// the MP4 index at the front) and grabs a still from each for the poster:
//   genre-snob-bg-landscape.webm/.mp4   1920x1080, wide screens
//   genre-snob-bg-vertical.webm/.mp4    1080x1920, phones held upright
//   bg-poster-landscape-960.webp        frame at 5 s, 960 wide
//   bg-poster-vertical-540.webp         frame at 5 s, 540 wide
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { ROOT } = require("./env");

const SRC = process.argv[2] || path.join(os.homedir(), "DMBuilds", "DMSite-shots", "bg");
const OUT = path.join(ROOT, "assets", "play", "genre-snob");
const LOCAL_FF = path.join(__dirname, "node_modules", "ffmpeg-static", "ffmpeg");
const FF = fs.existsSync(LOCAL_FF) ? LOCAL_FF : "ffmpeg";
fs.mkdirSync(OUT, { recursive: true });

for (const shape of ["landscape", "vertical"]) {
  for (const ext of ["webm", "mp4"]) {
    const name = "genre-snob-bg-" + shape + "." + ext;
    fs.copyFileSync(path.join(SRC, name), path.join(OUT, name));
  }
  const w = shape === "landscape" ? 960 : 540;
  execFileSync(FF, ["-v", "error", "-y", "-ss", "5", "-i", path.join(OUT, "genre-snob-bg-" + shape + ".mp4"),
    "-frames:v", "1", "-vf", "scale=" + w + ":-1:flags=area", "-c:v", "libwebp", "-quality", "72",
    path.join(OUT, "bg-poster-" + shape + "-" + w + ".webp")], { stdio: "inherit" });
}
console.log("wrote", OUT);
