# Range expressions

Equals supports range syntax for aggregating multiple results.

- `1..5` expands to the numbers 1 through 5.
- `$a:$d` expands to the values of variables `$a` through `$d`.

These ranges can be passed to helper functions such as `sum`, `avg`, `mean`, `median`, and `std`.

Examples:

```
$a = 1
$b = 2
$c = 3
$d = 4
sum($a:$d)   # 10
avg(1..4)    # 2.5
median(1..5) # 3
std(1..5)    # 1.5811
```
