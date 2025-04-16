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
      "type": "code",
      "cellHash": "4c22ee65d587da45ad571a90740ea5a50ba58ee88e75769fbc9ac47eef693e68",
      "isInline": false,
      "offsetBits": 0,
      "offsetRefs": 0,
      "bits": 40,
      "refs": 1,
      "opcodes": [
        {
          "bits": 16,
          "name": "ACCEPT",
          "gas": 26
        },
        {
          "bits": 16,
          "name": "PUSHINT",
          "args": [
            {
              "type": "int",
              "value": "123"
            }
          ],
          "gas": 26
        },
        {
          "bits": 8,
          "refs": 1,
          "name": "PUSHREF",
          "args": [
            {
              "type": "cell",
              "id": 1
            }
          ],
          "gas": 18
        }
      ],
      "tail": null
    },
    {
      "id": 1,
      "type": "data",
      "data": {
        "type": "cell",
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
