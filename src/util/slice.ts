import { beginCell, Cell, Slice } from "@ton/core";

export function makeSlice(
  cell: Cell,
  offsetBits: number,
  offsetRefs: number,
  bits: number,
  refs: number
): Slice {
  const d = cell.asSlice().skip(offsetBits).loadBits(bits);
  const b = beginCell().storeBits(d);
  for (let i = offsetRefs; i < offsetRefs + refs; i++) {
    b.storeRef(cell.refs[i]);
  }
  return b.asSlice();
}
