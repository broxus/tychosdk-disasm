# TVM Disasm

A Tycho TVM disasm.

## Installation

Requires node 16 or higher.

```bash
yarn add @tychosdk/disasm
```

or

```bash
npm i @tychosdk/disasm
```

## Usage

```typescript
import { Cell } from "@ton/core";
import { disasmStructured } from "@tychosdk/disasm";

const code = Cell.fromBase64("te6ccgEBAgEACwABCvgAgHuIAQABYA==");
const parsed = await disasmStructured(code);
```

### Example output

```json
{
  "root": 0,
  "items": [
    {
      "id": 0,
      "type": "Code",
      "cell_hash": "4c22ee65d587da45ad571a90740ea5a50ba58ee88e75769fbc9ac47eef693e68",
      "is_inline": false,
      "offset_bits": 0,
      "offset_refs": 0,
      "bits": 40,
      "refs": 1,
      "opcodes": [
        {
          "bits": 16,
          "text": "ACCEPT",
          "gas": 26
        },
        {
          "bits": 16,
          "text": "PUSHINT 123",
          "gas": 26
        },
        {
          "bits": 8,
          "refs": 1,
          "text": "PUSHREF (099083b6a05f453c20851a61b264b6405e30d5c9830133849ed66de1893e4554)",
          "gas": 18,
          "links": [
            {
              "to": 1,
              "ty": "Data"
            }
          ]
        }
      ],
      "tail": null
    },
    {
      "id": 1,
      "type": "Data",
      "data": {
        "type": "Cell",
        "boc": "te6ccgEBAQEAAwAAAWA="
      }
    }
  ]
}
```

## Development

### @tychosdk/disasm

To install dependencies:

```bash
yarn install
```

To build wasm:

```bash
yarn wasm:build
```

To run tests:

```bash
yarn test
```

To publish:

```bash
yarn build
yarn publish --access public
```

## Contributing

We welcome contributions to the project! If you notice any issues or errors,
feel free to open an issue or submit a pull request.

## License

Licensed under either of

* Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE)
  or <https://www.apache.org/licenses/LICENSE-2.0>)
* MIT license ([LICENSE-MIT](LICENSE-MIT)
  or <https://opensource.org/licenses/MIT>)

at your option.
