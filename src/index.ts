import { Cell } from "@ton/core";
import { wasm, wasmLoaded } from "./env";

import type { Code as WasmCode } from "./env";

/**
 * All code parts are referenced by a numberic ID.
 */
export type ItemId = number;

/**
 * Code is a group of parsed parts and an index from which to start.
 */
export type Code = {
  root: ItemId;
  items: Item[];
};

export type Item =
  | ({ id: number; type: "jumpTable" } & JumpTable)
  | ({ id: number; type: "code" } & CodeBlock)
  | ({ id: number; type: "dataBlock" } & DataBlock)
  | ({ id: number; type: "library" } & Library);
export type ItemType = Item["type"];

/**
 * Jump table is a dictionary which maps int to some continuations.
 */
export type JumpTable = {
  cellHash: string;
  keyBits: number;
  items: Record<string, ItemId>;
  isFullCode: boolean;
};

/**
 * Parsed continuation.
 */
export type CodeBlock = {
  cellHash: string;
  isInline: boolean;
  offsetBits: number;
  offsetRefs: number;
  bits: number;
  refs: number;
  opcodes: Opcode[];
  tail?: CodeBlockTail;
};

/**
 * What follows the continuation.
 */
export type CodeBlockTail =
  /// Some garbage if not all data was parsed into opcodes.
  | { type: "incomplete" }
  /// A child cell.
  | { type: "child"; id: ItemId };
export type CodeBlockTailType = CodeBlockTail["type"];

/**
 * Parsed opcode.
 */
export type Opcode = {
  bits: number;
  refs?: number;
  name: string;
  args: OpcodeArg[];
  gas: number;
};

/**
 * Parsed opcode argument.
 */
export type OpcodeArg =
  /// Example `PUSHINT 123`
  | { type: "int"; value: string }
  /// Example: `PUSH s1`
  | { type: "stack"; idx: number }
  /// Example: `POP c4`
  | { type: "reg"; idx: number }
  /// Example: `PUSHREFCONT (96a296d224f285c67bee93c30f8a309157f0daa35dc5b87e410b78630a09cfc7)`
  | { type: "cell"; id: ItemId }
  /// Example: `PUSHSLICECONST x{6_}`
  | { type: "slice"; id: ItemId };
export type OpcodeArgType = OpcodeArg["type"];

/**
 * Cell tree parts that are treated as data.
 */
export type DataBlock = {
  data: Data;
};

export type Data =
  | {
      type: "slice";
      offsetBits: number;
      offsetRefs: number;
      bits: number;
      refs: number;
      boc: string;
    }
  | {
      type: "cell";
      boc: string;
    };
export type DataType = Data["type"];

/// Library cell.
export type Library = {
  hash: string;
};

export async function disasmStructured(code: Cell | string): Promise<Code> {
  await wasmLoaded();

  let boc;
  if (code instanceof Cell) {
    boc = code.toBoc({ idx: false }).toString("base64");
  } else {
    boc = code;
  }

  const res = wasm.disasm_structured(boc);
  const parsed: WasmCode = JSON.parse(res);
  return parsed satisfies Code;
}
