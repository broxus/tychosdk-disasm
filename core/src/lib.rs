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
    | ({ type: "JumpTable" } & JumpTable)
    | ({ type: "Code" } & CodeBlock)
    | ({ type: "DataBlock" } & DataBlock)
    | ({ type: "Library" } & Library);

export type JumpTable = {
    cell_hash: string;
    key_bits: number;
    items: Record<string, ItemId>;
    is_full_code: boolean;
};

export type CodeBlock = {
    cell_hash: string;
    is_inline: boolean;
    offset_bits: number;
    offset_refs: number;
    bits: number;
    refs: number;
    opcodes: Opcode[];
    tail?: CodeBlockTail;
};

export type Opcode = {
    bits: number;
    refs?: number;
    text: string;
    gas: number;
    links?: Link[];
};

export type Link = {
    to?: ItemId;
    ty: LinkType;
};

export type LinkType =
    | "True"
    | "False"
    | "Cond"
    | "Body"
    | "Data";

export type CodeBlockTail =
    | { type: "Incomplete" }
    | { type: "Child", id: ItemId };

export type DataBlock = {
    data: Data;
};

export type Data = {
    type: "Slice";
    offset_bits: number;
    offset_refs: number;
    bits: number;
    refs: number;
    boc: string;
} | {
    type: "Cell";
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
