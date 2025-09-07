# <img width="50px" alt="equals_v2" src="https://github.com/user-attachments/assets/4c92723e-6b67-4085-9bf6-1b22419367ae" /> Equals

A tiny Electron calculator that evaluates each line as you type. Expressions are left-aligned while answers appear on the right, and the interface supports multiple tabs, themed gradients, and smart number formatting for currency, percentages, and variables.

<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/c8596c5b-bc9b-45e7-8ccf-73bb59c127f4" /> <img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/a94f2080-682e-4d49-bfcb-55c15cf17aa3" /> 
<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/2e7de768-0c1c-4837-8ef4-a1db8fb65beb" /> <img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/75256c9a-4375-4aa1-9927-af7270932ff7" /> 
<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/7ac6c637-dc82-402a-b8c6-4ff52a7f18dd" />

<img width="603" height="533" alt="image" src="https://github.com/user-attachments/assets/82eebbae-7237-4709-ba25-96968657db50" />



## Features
- Mica/Acrylic themed window with rounded gradient border
- Line-by-line calculations with syntax highlighting
- Currency, percent, and `$name =` variable support
- Unit-aware calculations and conversions
- Date-aware calculations with ISO dates and the `today` keyword
- Copyable results and persistent tabs/settings across sessions
- Configurable gradients, themes, window size, and font size
- Keyboard shortcuts for tab management and settings (`Ctrl+T` new tab, `Ctrl+Tab` cycle tabs, `Ctrl+W` close tab, `Ctrl+=` open settings)

## Wiki
Detailed documentation for Equals lives in the [docs](docs) directory:

- [Unit tokens](docs/units.md) – compact measurements and conversions such as `5cm` or `32F to C`.
- [Variables and references](docs/variables.md) – reuse values with `$name` and `""`.
- [Range expressions](docs/ranges.md) – aggregate numbers or variables with `1..5` and `$a:$d`.
- [Time expressions](docs/time.md) – mix `12:30pm`, `2h`, `45m`, and more.
- [Date expressions](docs/dates.md) – ISO dates and the `today` keyword.
- [Currency, percent, and number formatting](docs/formatting.md) – locale-aware output.
- [Tabs and settings](docs/interface.md) – managing tabs, themes, and window options.

## Building
1. Run `npm install`
2. Create an installer with `npm run build`
   - The installer lets you choose the install location, optionally launches the app when finished, and includes an uninstaller
   - Any running instance of the app is closed and previous `dist` output is removed before building to prevent file-in-use errors
   - When publishing, upload the generated `latest.yml` and installers to a GitHub release so the auto-updater can detect new versions

## Contributing
1. Fork and clone the repository
2. Run `npm install`
3. Make your changes with `npm test` to verify
4. Generate installers with `npm run build`
5. Submit a pull request describing your update

