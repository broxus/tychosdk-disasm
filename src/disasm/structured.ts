import { Cell, Slice } from "@ton/core";
import { wasm, wasmLoaded } from "../env";

import type { Code as WasmCode } from "../env";
import { makeSlice } from "../util/slice";

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
  | ({ id: number; type: "data" } & DataBlock)
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
  args?: OpcodeArg[];
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
  | ({ type: "slice" } & DataSlice)
  | ({ type: "cell" } & DataCell);
export type DataType = Data["type"];

export type DataSlice = {
  cellHash: string;
  offsetBits: number;
  offsetRefs: number;
  bits: number;
  refs: number;
};

export type DataCell = {
  cellHash: string;
};

/// Library cell.
export type Library = {
  cellHash: string;
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

export class CodeCells {
  private hashToCell: Map<string, Cell> = new Map();

  constructor(code: Cell | string) {
    type StackItem = {
      refs: Cell[];
      index: number;
    };

    if (typeof code === "string") {
      code = Cell.fromBase64(code);
    }

    const stack: StackItem[] = [];

    const addCell = (cell: Cell): boolean => {
      const reprHash = cell.hash(3).toString("hex");
      if (this.hashToCell.has(reprHash)) {
        return false;
      }

      this.hashToCell.set(reprHash, cell);
      if (cell.refs.length > 0) {
        stack.push({ refs: cell.refs, index: 0 });
      }
      return true;
    };

    addCell(code);

    outer: while (stack.length > 0) {
      const item = stack[stack.length - 1];
      while (item.index < item.refs.length) {
        const child = item.refs[item.index++];
        if (addCell(child)) {
          continue outer;
        }
      }
      stack.pop();
    }
  }

  getCell(
    hash: DataCell | DataSlice | Library | JumpTable | CodeBlock | string
  ): Cell {
    if (typeof hash === "object") {
      hash = hash.cellHash;
    }

    const res = this.hashToCell.get(hash);
    if (res == null) throw new Error("Unknown cell");
    return res;
  }

  getSlice(slice: DataSlice | CodeBlock): Slice {
    const cell = this.getCell(slice);
    return makeSlice(
      cell,
      slice.offsetBits,
      slice.offsetRefs,
      slice.bits,
      slice.refs
    );
  }
}

// === Expect Item ===

export function expectJumpTable(
  item: Item
): asserts item is { id: ItemId; type: "jumpTable" } & JumpTable {
  if (item.type !== "jumpTable") throw new Error("Expected jump table item");
}

export function expectCont(
  item: Item
): asserts item is { id: ItemId; type: "code" } & CodeBlock {
  if (item.type !== "code") throw new Error("Expected code item");
}

export function expectLibrary(
  item: Item
): asserts item is { id: ItemId; type: "library" } & Library {
  if (item.type !== "code") throw new Error("Expected library item");
}

export function expectData(
  item: Item
): asserts item is { id: ItemId; type: "data" } & Data {
  if (item.type !== "code") throw new Error("Expected data item");
}

// === Expect Data ===

export function expectDataSlice(
  item: Data
): asserts item is { type: "slice" } & DataSlice {
  if (item.type !== "slice") throw new Error("Expected slice data");
}

export function expectDataCell(
  item: Data
): asserts item is { type: "cell" } & DataCell {
  if (item.type !== "cell") throw new Error("Expected cell data");
}

// === Expect Opcode Arg ===

export function expectIntArg(
  opcode: OpcodeArg
): asserts opcode is { type: "int"; value: "string" } {
  if (opcode.type !== "int") throw new Error("Expected int arg");
}

export function expectStackArg(
  opcode: OpcodeArg
): asserts opcode is { type: "stack"; idx: number } {
  if (opcode.type !== "stack") throw new Error("Expected stack arg");
}

export function expectRegArg(
  opcode: OpcodeArg
): asserts opcode is { type: "reg"; idx: number } {
  if (opcode.type !== "reg") throw new Error("Expected reg arg");
}

export function expectCellArg(
  opcode: OpcodeArg
): asserts opcode is { type: "cell"; id: ItemId } {
  if (opcode.type !== "cell") throw new Error("Expected cell arg");
}

export function expectSliceArg(
  opcode: OpcodeArg
): asserts opcode is { type: "slice"; id: ItemId } {
  if (opcode.type !== "slice") throw new Error("Expected slice arg");
}

export function expectContArg(
  opcode: OpcodeArg
): asserts opcode is { type: "cell" | "slice"; id: ItemId } {
  if (opcode.type !== "cell" && opcode.type !== "slice")
    throw new Error("Expected slice arg");
}
