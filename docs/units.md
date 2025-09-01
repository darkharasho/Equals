# Units

Equals understands compact unit tokens and converts them into math.js `unit()` expressions.
This makes it easy to mix numbers and measurements or perform conversions without
extra syntax.

## Usage
- `5cm + 2in`
- `3kg to lb`
- `1l + 250ml`
- `32F to C`

Temperature symbols (`F`, `C`, `K`) are automatically mapped to `degF`, `degC`, and `K`.
You can also enter them on their own, e.g. `F to C`.

Behind the scenes the renderer replaces sequences like `5cm` or `32F` with
`unit(5, 'cm')` or `unit(32, 'degF')` before evaluation.
