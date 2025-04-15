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
import { wasm, wasmLoaded } from "./env";

export async function disasmStructured(code: string): Promise<Code> {
  await wasmLoaded();
  const res = wasm.disasm_structured(code);
  return JSON.parse(res) as Code;
}
