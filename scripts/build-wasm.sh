#!/usr/bin/env bash
set -eE

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
root_dir=$(cd "${script_dir}/../" && pwd -P)

# Clean previous packages
if [ -d "pkg" ]; then
    rm -rf pkg
fi

BASE_NAME="tycho_disasm"

cd "$root_dir"

# Build for both targets
CRATE="$root_dir/core"
WASM_BROWSER_DIR="$root_dir/src/wasm"
WASM_NODEJS_DIR="$root_dir/src/wasm-nodejs"
wasm-pack build "$CRATE" --release -t web -d "$WASM_BROWSER_DIR" --out-name "$BASE_NAME"
wasm-pack build "$CRATE" --release -t nodejs -d "$WASM_NODEJS_DIR" --out-name "$BASE_NAME"

cp "${WASM_NODEJS_DIR}/${BASE_NAME}.js" "${WASM_BROWSER_DIR}/${BASE_NAME}_node.js"
cp "${WASM_NODEJS_DIR}/${BASE_NAME}.d.ts" "${WASM_BROWSER_DIR}/${BASE_NAME}_node.d.ts"

sed -i -e "s/__wbindgen_placeholder__/wbg/g" "${WASM_BROWSER_DIR}/${BASE_NAME}_node.js"
mv "${WASM_BROWSER_DIR}/${BASE_NAME}.js" "${WASM_BROWSER_DIR}/${BASE_NAME}.mjs"

rm -rf "$WASM_BROWSER_DIR/package.json"
rm -rf "$WASM_NODEJS_DIR"
