# <img width="50px" alt="equals" src="https://github.com/user-attachments/assets/8d5cc447-292a-4837-af3e-efe1ab889ecd" /> Equals

A tiny Electron calculator that evaluates each line as you type. Expressions are left-aligned while answers appear on the right, and the interface supports multiple tabs, themed gradients, and smart number formatting for currency, percentages, and variables.

<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/fb17e969-2ab8-474f-b8d6-e079d12cd32a" />


## Features
- Mica/Acrylic themed window with rounded gradient border
- Line-by-line calculations with syntax highlighting
- Currency, percent, and `$name =` variable support
- Unit-aware calculations and conversions
- Copyable results and persistent tabs/settings across sessions
- Configurable gradients, themes, window size, and font size

## Wiki
Detailed documentation for Equals lives in the [docs](docs) directory:

- [Unit tokens](docs/units.md) – compact measurements and conversions such as `5cm` or `32F to C`.
- [Variables and references](docs/variables.md) – reuse values with `$name` and `""`.
- [Time expressions](docs/time.md) – mix `12:30pm`, `2h`, `45m`, and more.
- [Currency, percent, and number formatting](docs/formatting.md) – locale-aware output.
- [Tabs and settings](docs/interface.md) – managing tabs, themes, and window options.

## Building
1. Run `npm install`
2. Create an installer with `npm run build`
   - Also produces a standalone portable `.zip` alongside the setup executable in `dist`
   - The installer lets you choose the install location, optionally launches the app when finished, and includes an uninstaller
   - Any running instance of the app is closed and previous `dist` output is removed before building to prevent file-in-use errors

## Contributing
1. Fork and clone the repository
2. Run `npm install`
3. Make your changes with `npm test` to verify
4. Generate installers with `npm run build`
5. Submit a pull request describing your update

