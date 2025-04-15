import { disasmStructured } from "./index";

describe("disasm", () => {
  it("parses simple code", async () => {
    const code = await disasmStructured("te6ccgEBAgEACwABCvgAgHuIAQABYA==");
    console.log(code);
  });
});
