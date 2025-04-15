import * as browserWasm from "./wasm/tycho_disasm_node.js";
const init = require("./wasm/tycho_disasm_node.js").default;

export type * from "./wasm/tycho_disasm_node.js";

let wasmInitializationStarted = false;
let notifyWasmInitialized: { resolve: () => void; reject: () => void };

const initializationPromise: Promise<void> = new Promise<void>(
  (resolve, reject) => {
    notifyWasmInitialized = { resolve, reject };
  }
);

export const wasm = browserWasm;
export const wasmLoaded = (initInput?: any): Promise<void> => {
  if (typeof init === "function") {
    if (!wasmInitializationStarted) {
      wasmInitializationStarted = true;
      (init as any)(initInput)
        .then(notifyWasmInitialized.resolve)
        .catch(notifyWasmInitialized.reject);
    }
    return initializationPromise;
  } else {
    return Promise.resolve();
  }
};
