# Date Expressions

Equals can parse ISO-style dates like `2024-05-15` and the keyword `today`.
These tokens are converted to day counts so you can add or subtract days or
measure the difference between two dates.

Results are shown as dates when any date token is involved. When only day counts
are present, the result is formatted as a duration in days.

## Examples
- `today + 3 days` → `2024-05-18` (if today is `2024-05-15`)
- `2024-06-01 - 2024-05-15` → `17 days`
- `2024-06-01 + 2d` → `2024-06-03`
