# Time Expressions

Equals can parse times of day and durations. Tokens like `12:30pm`, `2h`,
`45m`, or `30s` are converted to minutes behind the scenes so you can mix and
match them in calculations.

Results are formatted as a time of day when any time-of-day token appears;
otherwise they are displayed as a duration.

## Examples
- `12:15pm + 1h 30m` → `1:45pm`
- `1h 15m + 45m` → `2hr`
- `"" + 30m` adds thirty minutes to the last result
