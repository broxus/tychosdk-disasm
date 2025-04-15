export type {
  Code,
  CodeBlock,
  CodeBlockTail,
  Data,
  DataBlock,
  Item,
  ItemId,
  JumpTable,
  Library,
  Link,
  LinkType,
  Opcode,
} from "./env";

import type { Code } from "./env";
import { Cell } from "@ton/core";
import { wasm, wasmLoaded } from "./env";

export async function disasmStructured(code: Cell | string): Promise<Code> {
  await wasmLoaded();

  let boc;
  if (code instanceof Cell) {
    boc = code.toBoc({ idx: false }).toString("base64");
  } else {
    boc = code;
  }

  const res = wasm.disasm_structured(boc);
  return JSON.parse(res) as Code;
}
