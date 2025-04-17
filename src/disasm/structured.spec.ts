import { Cell } from "@ton/core";
import { disasmStructured } from "./structured";

describe("structured disasm", () => {
  it("parses code as string", async () => {
    const code = await disasmStructured("te6ccgEBAgEACwABCvgAgHuIAQABYA==");
    console.log(code);
  });

  it("parses code as cell", async () => {
    const code = await disasmStructured(
      Cell.fromBase64("te6ccgEBAgEACwABCvgAgHuIAQABYA==")
    );
    console.log(code);
  });
});
