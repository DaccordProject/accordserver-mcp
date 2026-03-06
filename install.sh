#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/DaccordProject/accordserver-mcp.git"
INSTALL_DIR="${HOME}/.local/share/accord-mcp"

echo "Installing Accord MCP client..."

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  git clone "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
npm install
npm run build

# Symlink binary
BIN_DIR="${HOME}/.local/bin"
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/dist/index.js" "$BIN_DIR/accord-mcp"

echo ""
echo "Installed to $INSTALL_DIR"
echo "Binary linked at $BIN_DIR/accord-mcp"

# Check if ~/.local/bin is in PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  echo ""
  echo "Add ~/.local/bin to your PATH if not already present:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo "Usage:"
echo "  export ACCORD_MCP_API_KEY=\"your-key\""
echo "  accord-mcp"
