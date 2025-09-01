# Variables and References

Lines can assign results to a name using the `$name =` syntax. The value is
available to later expressions via `$name`. The special token `""`
represents the result from the previous line.

## Examples
- `$tax = 8%`
- `$subtotal = 120`
- `$subtotal * (1 + $tax)`
- `"" + 5` (adds the last answer to five)

Variables retain their associated formatting, units, and time metadata, so using
a value later preserves things like currency symbols or time-of-day formatting.
