import { disasmToFift } from "./fift";
import fs from "fs";

describe("disasm to fift", () => {
  it("parses wallet code into fift", async () => {
    const code = await disasmToFift(
      "te6ccgEBBgEA/AABFP8A9KQT9LzyyAsBAgEgBQIC5vJx1wEBwADyeoMI1xjtRNCDB9cB1ws/yPgozxYjzxbJ+QADcdcBAcMAmoMH1wFRE7ry4GTegEDXAYAg1wGAINcBVBZ1+RDyqPgju/J5Zr74I4EHCKCBA+ioUiC8sfJ0AiCCEEzuZGy64w8ByMv/yz/J7VQEAwA+ghAWnj4Ruo4R+AACkyDXSpd41wHUAvsA6NGTMvI84gCYMALXTND6QIMG1wFx1wF41wHXTPgAcIAQBKoCFLHIywVQBc8WUAP6AstpItAhzzEh10mghAm5mDNwAcsAWM8WlzBxAcsAEsziyQH7AAAE0jA="
    );
    console.log(code);
  });

  it("parses elector code into fift", async () => {
    const _code = await disasmToFift(
      "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"
    );

    // fs.writeFileSync("elector.fif", code);
    // console.log(code);
  });
});
