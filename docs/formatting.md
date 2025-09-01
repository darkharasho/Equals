# Currency, Percent, and Number Formatting

Values prefixed with `$`, `€`, or `£` are treated as currency and rendered using
the localised formatting rules for USD, EUR, or GBP. Percentages like `5%` can be
mixed directly into expressions and are converted into their decimal form.

## Examples
- `$12 + $3.50`
- `100 + 5%` → `105`
- `$subtotal * (1 + $tax)`

Numeric results are automatically formatted with the appropriate number of
fractional digits based on the input.
