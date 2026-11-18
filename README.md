# nerd-herd

nerd-herd is a set of mods for Herdr, the desktop app whose sidebar lists your machines and the spaces on each one.

- **Spaces mod (done):** replaces the sidebar's Spaces section and gathers machines into groups, such as Personal and Work.
- **Agents mod (draft spec only):** a header for each machine in the Agents section, with that machine's agent sessions beneath it.

## What the Spaces mod does

- **Groups of machines.** Make a group, then drag a machine onto it. The machine's spaces move with it.
- **Nested groups.** Drop a group on another group to put it inside.
- **Order.** Each level keeps its groups above its machines by default. Drag freely, and that level switches to a custom order that keeps every drop exactly where you made it. A level can also sort A to Z or Z to A.
- **Folding.** A folded group keeps its header and shows how many machines it holds.
- **Icons and banners.** A group can show an emoji icon, or a banner image from a web link or a file on your computer.
  - A banner is copied into nerd-herd when you save it, so it still shows after the file moves or the web page goes away.
  - After the image at a link changes, press **Reload images** in the group's settings to copy it again.
- **Your word for groups.** Rename "Groups" to anything, such as "Environments", and the sidebar uses that word everywhere.
- **Keyboard.** Move through the rows, fold groups, and cut and paste machines between groups.
- **Damaged saved data.** If the saved groups cannot be read, Spaces shows Herdr's usual list with an error card, and keeps a backup for **Try again**.

The full behavior, with every case that is tested, is in the [Spaces spec](docs/specs/completed/executing-nerd-herd-spaces.html). Open it in a browser, or run `bun run specs:serve`.

## Requirements

- macOS, with Herdr in `/Applications`. nerd-herd is built against Herdr 0.1.16.
- The `herdr-app` command on your `PATH`. It ships inside the app, at `/Applications/Herdr.app/Contents/MacOS/Herdr`.
- [Bun](https://bun.sh). nerd-herd is built with Bun 1.4.2.
- For the end-to-end walks only:
  - Xcode's `swiftc`, which builds the text reader that reads the window through Apple's Vision framework.
  - The `hc` command from herdr-core, and at least one connected machine besides this computer.
  - [yabai](https://github.com/koekeishiya/yabai) is optional. When it is present, the walks float and size their own test window, so a tiling layout cannot change the window's size.

## Install

```sh
bun install
bun run herdr:install
```

`bun run herdr:install` builds the mod, installs it and the nerd-herd layout into your Herdr home (`~/.config/herdr-app`), and switches Herdr to that layout. Run it again after you pull changes.

To try the mod without touching your own Herdr setup, give it a separate home. It then opens a separate Herdr window for that home:

```sh
HERDR_APP_HOME="$PWD/.hw-home" bun run herdr:install
HERDR_APP_HOME="$PWD/.hw-home" bun scripts/stop-window.ts   # quit that window when you are done
```

## Development

| Command | What it does |
|---|---|
| `bun run check:all` | Lint, typecheck, unit tests, module boundaries, and the build. Run it, and `bun run test:e2e`, before every commit. |
| `bun run test` | Unit tests for the core logic and the scripts. |
| `bun run test:e2e` | End-to-end walks: each starts its own Herdr test window, drives it with commands, and reads the screen. Takes about 4 minutes. |
| `bun run build` | Builds the mod into `dist/mods/nerd-herd-spaces`. |
| `bun run check:mod` | Builds the mod and runs Herdr's own check on it. |
| `bun run specs:serve` | Serves the specs in `docs/specs` for reading in a browser. |

The walks never move your pointer or type on your keyboard. Their test windows open in the background, and `caffeinate` keeps the displays awake while they run.

### Layout

| Path | What it holds |
|---|---|
| `src/core` | The logic, with no Herdr imports: groups, ordering, sorting, commands, banners, saved data, and keyboard steps. Unit tested. |
| `src/mod` | The Herdr side: the view, the dialogs, and the adapters that connect the core to Herdr. |
| `src/mod/vendor` | Herdr's own Spaces mod, copied by `scripts/vendor-spaces.ts` with the patches in `patches/spaces/` applied and nerd-herd's changes marked. |
| `patches/spaces` | Patch files for Herdr's Spaces mod, such as other people's mods' sidebar changes. `10-jj-sidebar.patch` is from [herdr-app-jj](https://github.com/sebcbi1/herdr-app-jj) (MIT); `20-jj-login-shell-path.patch` is nerd-herd's own, and finds jj on other machines through the user's login shell. |
| `e2e` | The end-to-end walks and their harness. |
| `scripts` | Start, build, the test window's sizing and shutdown, and the Herdr mod copy. |
| `docs/specs` | Specs, one folder per stage: ideas, drafts, finalized, in progress, completed, and abandoned. |

Coding agents: read [AGENTS.md](AGENTS.md) before you change anything.

## License

[MIT](LICENSE), except `src/mod/vendor/herdrSpaces.js`. That file is Herdr's own Spaces mod with nerd-herd's changes, and it stays under the [Apache License 2.0](src/mod/vendor/LICENSE-APACHE-2.0) from the Herdr authors.
