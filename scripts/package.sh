#!/bin/bash
# Word Racing — Distribution Packaging Script
# Creates a clean zip ready for end users
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0")
DIST_DIR="dist"
BUILD_ID=$(date +%Y%m%d-%H%M%S 2>/dev/null || echo "latest")
PACKAGE_NAME="word-racing-v${VERSION}"
PACKAGE_DIR="${DIST_DIR}/${BUILD_ID}/${PACKAGE_NAME}"
ZIP_FILE="${DIST_DIR}/${PACKAGE_NAME}.zip"

echo "Packaging Word Racing v${VERSION} (build ${BUILD_ID})..."

# Clean previous build (best effort)
rm -rf "${DIST_DIR}/${BUILD_ID}" 2>/dev/null || true
mkdir -p "${PACKAGE_DIR}"

# === Source files ===
cp index.html "${PACKAGE_DIR}/"

# Core modules
cp -r js        "${PACKAGE_DIR}/"
cp -r core      "${PACKAGE_DIR}/"
cp -r learning  "${PACKAGE_DIR}/"
cp -r views     "${PACKAGE_DIR}/"
cp -r ui        "${PACKAGE_DIR}/"
cp -r systems   "${PACKAGE_DIR}/"
cp -r config    "${PACKAGE_DIR}/"
cp -r quiz      "${PACKAGE_DIR}/"
cp -r rendering "${PACKAGE_DIR}/"
cp -r 3d        "${PACKAGE_DIR}/"

# Data (word lists + track data only, not dev scripts)
cp -r data      "${PACKAGE_DIR}/"
rm -f "${PACKAGE_DIR}/data/update-log.txt"
rm -f "${PACKAGE_DIR}/data/update-progress.json"
rm -f "${PACKAGE_DIR}/data/vocabulary-supplement-"*.md

# CSS
cp -r css "${PACKAGE_DIR}/"

# Remove dev-only files from distribution
find "${PACKAGE_DIR}" -name '.gitkeep' -delete
rm -f "${PACKAGE_DIR}/3d/README.md"

# Debug commands (loaded conditionally in dev only)
mkdir -p "${PACKAGE_DIR}/scripts"
cp scripts/debug-commands.js "${PACKAGE_DIR}/scripts/"

# === Launch scripts ===
cp 启动游戏.bat "${PACKAGE_DIR}/"
# Ensure CRLF line endings for Windows batch file
python3 -c "
import sys; sys.exit(0)
with open('${PACKAGE_DIR}/启动游戏.bat', 'rb') as f:
    data = f.read()
data = data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
with open('${PACKAGE_DIR}/启动游戏.bat', 'wb') as f:
    f.write(data)
" 2>/dev/null || python -c "
with open('${PACKAGE_DIR}/启动游戏.bat', 'rb') as f:
    data = f.read()
data = data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
with open('${PACKAGE_DIR}/启动游戏.bat', 'wb') as f:
    f.write(data)
"

# Create Mac/Linux launcher
cat > "${PACKAGE_DIR}/start.sh" << 'LAUNCHER'
#!/bin/bash
echo "Starting Word Racing..."
PORT=${1:-3000}
echo "Opening http://localhost:${PORT}"
if command -v python3 &>/dev/null; then
  python3 -m http.server "$PORT"
elif command -v python &>/dev/null; then
  python -m http.server "$PORT"
elif command -v npx &>/dev/null; then
  npx serve . -p "$PORT"
else
  echo "Error: Need Python or Node.js installed."
  exit 1
fi
LAUNCHER
chmod +x "${PACKAGE_DIR}/start.sh"

# === Create README for distribution ===
cat > "${PACKAGE_DIR}/README.txt" << 'README'
Word Racing — Vocabulary Learning Game
=======================================

HOW TO START

  Windows:  Double-click 启动游戏.bat
  Mac/Linux: Run ./start.sh in terminal
  Manual:   python -m http.server 3000
            Then open http://localhost:3000

SYSTEM REQUIREMENTS

  Any modern browser (Chrome, Edge, Firefox, Safari)
  Python 3 (included on most systems)
  — or Node.js (for the .bat launcher)
  No installation needed. No dependencies to download.

SAVE DATA

  Everything is saved in your browser's localStorage.
  Clearing browser data will delete progress.

Usage: print this file again
  Windows:  type README.txt
  Mac/Linux: cat README.txt
README

echo ""
echo "Package created: ${PACKAGE_DIR}"

# Create zip
if command -v zip &>/dev/null; then
  cd "${DIST_DIR}/${BUILD_ID}"
  zip -r "../../${PACKAGE_NAME}.zip" "${PACKAGE_NAME}" -x "*.DS_Store"
  cd "$PROJECT_ROOT"
  rm -rf "${DIST_DIR}/${BUILD_ID}"
  echo "Done: ${ZIP_FILE}"
elif command -v powershell.exe &>/dev/null; then
  powershell.exe -Command "Compress-Archive -Path '${PACKAGE_DIR}' -DestinationPath '${ZIP_FILE}' -Force"
  rm -rf "${DIST_DIR}/${BUILD_ID}"
  echo "Done: ${ZIP_FILE}"
else
  echo "Warning: zip command not found. Package folder at ${PACKAGE_DIR}"
fi
