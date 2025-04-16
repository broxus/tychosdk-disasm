use anyhow::{Context, Result};
use everscale_types::boc::Boc;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const MODELS: &str = r###"
export type ItemId = number;

export type Code = {
    root: ItemId;
    items: Item[];
};

export type Item =
    | ({ id: number; type: "jumpTable" } & JumpTable)
    | ({ id: number; type: "code" } & CodeBlock)
    | ({ id: number; type: "dataBlock" } & DataBlock)
    | ({ id: number; type: "library" } & Library);

export type JumpTable = {
    cellHash: string;
    keyBits: number;
    items: Record<string, ItemId>;
    isFullCode: boolean;
};

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

export type Opcode = {
    bits: number;
    refs?: number;
    name: string;
    args: OpcodeArg[];
    gas: number;
};

export type OpcodeArg =
    | { type: "int"; value: string }
    | { type: "stack"; idx: number }
    | { type: "reg"; idx: number }
    | { type: "cell"; id: ItemId }
    | { type: "slice"; id: ItemId };

export type CodeBlockTail =
    | { type: "incomplete" }
    | { type: "child", id: ItemId };

export type DataBlock = {
    data: Data;
};

export type Data = {
    type: "slice";
    offsetBits: number;
    offsetRefs: number;
    bits: number;
    refs: number;
    boc: string;
} | {
    type: "cell";
    boc: string;
};

export type Library = {
    hash: string;
};
"###;

#[wasm_bindgen]
pub fn disasm_structured(code: &str) -> Result<js_sys::JsString, JsValue> {
    (|| {
        let code = Boc::decode_base64(code).context("Failed to deserialize code cell")?;
        let code = tycho_disasm::disasm_structured(code).context("Failed to disasm code")?;
        let data = serde_json::to_string(&code).unwrap();
        Ok::<_, anyhow::Error>(JsValue::from(data).unchecked_into())
    })()
    .map_err(|e| JsValue::from(e.to_string()))
}
