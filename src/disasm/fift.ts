import { Cell } from "@ton/core";
import {
  disasmStructured,
  expectCellArg,
  expectContArg,
  expectIntArg,
  expectSliceArg,
  CodeBlock,
  CodeCells,
  Item,
  ItemId,
  JumpTable,
  Opcode,
  OpcodeArg,
} from "./structured";

export async function disasmToFift(
  code: Cell | string,
  params: {
    tabWidth?: number;
  } = {}
): Promise<string> {
  const { root, items } = await disasmStructured(code);

  const codeCells = new CodeCells(code);
  const ctx = new Context(items, codeCells, {
    tabWidth: params.tabWidth != null ? params.tabWidth : 2,
  });

  new State(ctx, 0).disasm(ctx.getCode(root));

  return ctx.output;
}

class State {
  private contX?: CodeBlock;
  private contY?: CodeBlock;
  private dict?: JumpTable;

  constructor(private ctx: Context, private depth: number) {}

  disasm(block: CodeBlock) {
    while (true) {
      let opcodeBits = 0;
      let opcodeRefs = 0;
      for (const opcode of block.opcodes) {
        this.showOp(opcode);
        opcodeBits += opcode.bits;
        opcodeRefs += opcode.refs || 0;
      }

      if (block.tail == null) {
        this.dict = undefined;
        this.flushCont();
        break;
      } else if (block.tail.type === "incomplete") {
        this.dict = undefined;
        this.flushCont();
        this.showIncompleteTail(block, opcodeBits, opcodeRefs);
        break;
      } else {
        block = this.ctx.getCode(block.tail.id);
      }
    }
  }

  showIncompleteTail(block: CodeBlock, opcodeBits: number, opcodeRefs: number) {
    type StackItem = { depth: number; refs: Cell[]; index: number };

    const cell = this.ctx.getCell(block.cellHash);
    const bits = cell
      .asSlice()
      .skip(block.offsetBits + opcodeBits)
      .loadBits(block.bits - opcodeBits);
    this.writeln(`Cannot disassemble: x{${bits.toString()}}`);

    const stack: StackItem[] = [];
    if (opcodeRefs < block.refs) {
      stack.push({
        depth: 1,
        refs: cell.refs.slice(
          block.offsetRefs + opcodeRefs,
          block.offsetRefs + block.refs
        ),
        index: block.offsetRefs + opcodeRefs,
      });
    }

    const prevDepth = this.depth;
    this.depth = 0;

    outer: while (stack.length > 0) {
      const item = stack[stack.length - 1];
      while (item.index < item.refs.length) {
        const child = item.refs[item.index++];

        const indent = " ".repeat(item.depth);
        this.writeln(`${indent}x{${child.bits.toString()}}`);

        if (child.refs.length > 0) {
          stack.push({
            depth: item.depth + 1,
            refs: child.refs,
            index: 0,
          });
          continue outer;
        }
      }
      stack.pop();
    }

    this.depth = prevDepth;
  }

  showOp(opcode: Opcode) {
    // Track consequent dict ops.
    switch (opcode.name) {
      case "DICTPUSHCONST": {
        const [n, dict] = opcode.args!;
        expectIntArg(n);
        expectSliceArg(dict);

        this.flushCont();

        this.dict = this.ctx.getJumpTable(dict.id);

        this.showSimpleOp(opcode);
        return;
      }

      case "DICTIGETJMP":
      case "DICTIGETJMPZ":
      case "DICTUGETJMP":
      case "DICTUGETJMPZ":
      case "DICTIGETEXEC":
      case "DICTUGETEXEC": {
        if (this.dict != null) {
          this.flushCont();
          this.showConstDictOp(opcode);
          return;
        }
        break;
      }
    }

    // Reset dict.
    this.dict = undefined;

    // Track consequent cont ops.
    switch (opcode.name) {
      case "PUSHCONT":
      case "PUSHREFCONT": {
        const [cont] = opcode.args!;
        expectContArg(cont);

        this.saveContBody(this.ctx.getCode(cont.id));
        return;
      }

      case "REPEAT":
      case "UNTIL":
      case "IF":
      case "IFNOT":
      case "IFJMP":
      case "IFNOTJMP": {
        if (this.contX != null) {
          this.flushContY();
          this.showContOp(opcode.name);
          return;
        }
        break;
      }

      case "IFREF":
      case "IFNOTREF":
      case "IFJMPREF":
      case "IFNOTJMPREF":
      case "CALLREF":
      case "JMPREF": {
        this.flushCont();
        this.showRefOp(opcode);
        return;
      }

      case "WHILE": {
        if (this.contY != null) {
          this.showCont2Op("WHILE", "DO");
          return;
        }
        break;
      }

      case "IFELSE": {
        if (this.contY != null) {
          this.showCont2Op("IF", "ELSE");
          return;
        }
        break;
      }

      case "IFREFELSE": {
        if (this.contX != null) {
          this.showContRefOp(opcode, "IF", "ELSE", false);
          return;
        }
        break;
      }

      case "IFELSEREF": {
        if (this.contX != null) {
          this.showContRefOp(opcode, "IF", "ELSE", true);
          return;
        }
        break;
      }

      case "IFREFELSEREF": {
        this.showRef2Op(opcode, "IF", "ELSE");
        return;
      }
    }

    // Fallback to simple opcode.
    this.flushCont();
    this.showSimpleOp(opcode);
  }

  showSimpleOp(opcode: Opcode) {
    opcode = this.adjustOpcode(opcode);

    let args = "";
    if (opcode.args != null) {
      for (const arg of opcode.args) {
        args += `${this.ctx.argToString(arg)} `;
      }
    }
    this.writeln(`${args}${opcode.name}`);
  }

  adjustOpcode(opcode: Opcode): Opcode {
    switch (opcode.name) {
      case "SETCP0": {
        if (opcode.args == null || opcode.args.length === 0) {
          return {
            ...opcode,
            name: "SETCP",
            args: [{ type: "int", value: "0" }],
          };
        }
        break;
      }

      case "XCHG": {
        if (opcode.args != null && opcode.args.length === 1) {
          return {
            ...opcode,
            args: [{ type: "stack", idx: 0 }, ...opcode.args],
          };
        }
        break;
      }

      case "LSHIFT": {
        if (opcode.args != null && opcode.args.length > 0) {
          return {
            ...opcode,
            name: "LSHIFT#",
          };
        }
        break;
      }

      case "RSHIFT": {
        if (opcode.args != null && opcode.args.length > 0) {
          return {
            ...opcode,
            name: "RSHIFT#",
          };
        }
        break;
      }
    }

    // Fallback to the original.
    return opcode;
  }

  showRefOp(opcode: Opcode) {
    this.flushCont();
    const [ref] = opcode.args!;
    expectCellArg(ref);
    this.writeln(`${opcode.name.slice(0, -3)}:<{`);
    this.depth += 1;
    this.disasm(this.ctx.getCode(ref.id));
    this.depth -= 1;
    this.writeln("}>");

    if (this.contX != null) {
      throw new Error("Invalid cont state");
    }
  }

  showContRefOp(
    opcode: Opcode,
    prefix: string,
    infix: string,
    firstIsCont: boolean
  ) {
    this.flushContY();
    const [ref] = opcode.args!;
    expectCellArg(ref);
    this.writeln(`${prefix}:<{`);

    if (this.contX == null) throw new Error("Inconsistent contX state");
    const branches = [this.ctx.getCode(ref.id), this.contX];
    this.contX = undefined;

    this.depth += 1;
    this.disasm(branches[+firstIsCont]);
    this.depth -= 1;
    this.writeln(`}>${infix}<{`);
    this.depth += 1;
    this.disasm(branches[+!firstIsCont]);
    this.depth -= 1;
    this.writeln("}>");
  }

  showRef2Op(opcode: Opcode, prefix: string, infix: string) {
    this.flushCont();
    const [ref1, ref2] = opcode.args!;
    expectCellArg(ref1);
    expectCellArg(ref2);

    this.writeln(`${prefix}:<{`);
    this.depth += 1;
    this.disasm(this.ctx.getCode(ref1.id));
    this.depth -= 1;
    this.writeln(`}>${infix}<{`);
    this.depth += 1;
    this.disasm(this.ctx.getCode(ref2.id));
    this.depth -= 1;
    this.writeln("}>");

    if (this.contX != null) {
      throw new Error("Invalid cont state");
    }
  }

  showContOp(prefix: string) {
    this.showContBody(prefix, ":<{");
    this.writeln("}>");

    if (this.contX != null) {
      throw new Error("Invalid cont state");
    }
  }

  showCont2Op(prefix: string, infix: string) {
    this.swapCont();
    this.showContBody(prefix, ":<{");
    this.swapCont();
    this.showContBody(`}>${infix}`, "<{");
    this.writeln("}>");

    if (this.contX != null || this.contY != null) {
      throw new Error("Invalid cont state");
    }
  }

  showConstDictOp(opcode: Opcode) {
    this.flushCont();
    if (this.dict == null) throw new Error("Inconsistent dict state");

    const dictItems = Object.entries(this.dict.items).map(([key, value]) => ({
      key: BigInt(key),
      value,
    }));
    dictItems.sort(({ key: a }, { key: b }) => (a < b ? -1 : a > b ? 1 : 0));

    if (dictItems.length === 0) {
      this.writeln(`${opcode.name} {}`);
    } else {
      this.writeln(`${opcode.name} {`);
      this.depth += 1;
      for (const item of dictItems) {
        this.writeln(`${item.key} => <{`);
        new State(this.ctx, this.depth + 1).disasm(
          this.ctx.getCode(item.value)
        );
        this.writeln("}>");
      }
      this.depth -= 1;
      this.writeln("}");
    }

    this.dict = undefined;
  }

  showContBody(prefix: string, paren: string) {
    if (this.contX == null) throw new Error("Inconsistent contX state");
    this.writeln(`${prefix}${paren}`);
    new State(this.ctx, this.depth + 1).disasm(this.contX);

    this.contX = undefined;
  }

  flushContX() {
    if (this.contX != null) {
      this.showContOp("CONT");
    }
  }

  flushContY() {
    if (this.contY != null) {
      this.swapCont();
      this.showContOp("CONT");
      this.swapCont();
    }
  }

  flushCont() {
    this.flushContY();
    this.flushContX();
  }

  saveContBody(cont: CodeBlock) {
    this.flushContY();
    this.contY = cont;
    this.swapCont();
  }

  swapCont() {
    const contY = this.contY;
    this.contY = this.contX;
    this.contX = contY;
  }

  writeln(data: string) {
    this.ctx.writeln(this.depth, data);
  }
}

class Context {
  private tab: string;
  private string: string = "";

  constructor(
    private items: Item[],
    private cells: CodeCells,
    params: { tabWidth: number }
  ) {
    this.tab = " ".repeat(params.tabWidth);
  }

  get output(): string {
    return this.string;
  }

  writeln(indent: number, data: string) {
    this.string += `${this.tab.repeat(indent)}${data}\n`;
  }

  argToString(arg: OpcodeArg) {
    switch (arg.type) {
      case "int":
        return arg.value;
      case "stack": {
        if (arg.idx < 0) {
          return `s(${arg.idx})`;
        } else {
          return `s${arg.idx}`;
        }
      }
      case "reg": {
        return `c${arg.idx}`;
      }
      case "cell": {
        const item = this.items[arg.id];
        let cellHash;
        switch (item.type) {
          case "code": {
            if (item.isInline) throw new Error("Unexpected inline cont");
            cellHash = item.cellHash;
            break;
          }
          case "library": {
            cellHash = item.cellHash;
            break;
          }
          case "data": {
            if (item.data.type !== "cell") throw new Error("Unexpected slice");
            cellHash = item.data.cellHash;
            break;
          }
          case "jumpTable": {
            throw new Error("Unexpected jump table");
          }
        }
        return `(${cellHash.toUpperCase()})`;
      }
      case "slice": {
        const item = this.items[arg.id];
        let bits;
        let refCount;
        switch (item.type) {
          case "code": {
            if (!item.isInline) throw new Error("Unexpected non-inline cont");
            const cell = this.getCell(item.cellHash);
            bits = cell.asSlice().skip(item.offsetBits).loadBits(item.bits);
            refCount = item.refs;
            break;
          }
          case "data": {
            if (item.data.type !== "slice") throw new Error("Unexpected cell");
            const { data } = item;
            const cell = this.getCell(data.cellHash);
            bits = cell.asSlice().skip(data.offsetBits).loadBits(data.bits);
            refCount = data.refs;
            break;
          }
          case "jumpTable": {
            // NOTE: Jump table is always shown like this.
            return "(xC_)";
          }
          case "library": {
            throw new Error("Unexpected library cell");
          }
        }

        if (refCount > 0) {
          return `(${bits.toString()},${refCount})`;
        } else {
          return `x{${bits.toString()}}`;
        }
      }
    }
  }

  getCell(hash: string): Cell {
    return this.cells.getCell(hash);
  }

  getCode(id: ItemId): CodeBlock {
    const item = this.items[id];
    if (item.type === "library") {
      throw new Error("Library cells are not supported for now");
    } else if (item.type !== "code") {
      throw new Error(`Unexpected item: ${item.type}`);
    }
    return item;
  }

  getJumpTable(id: ItemId): JumpTable {
    const item = this.items[id];
    if (item.type !== "jumpTable") {
      throw new Error(`Unexpected item: ${item.type}`);
    }
    return item;
  }
}
