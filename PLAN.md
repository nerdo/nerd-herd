# herdr-sidebar plan

A Herdr mod pair that replaces the sidebar's Spaces and Agents sections with
clearer versions. Mode: build order (no spec), switching to a spec if the design
needs more back and forth.

## The request, in parts

1. **Folders for remotes.** A "+ folder" button next to the Spaces "+" makes a
   folder (a group of remote machines, such as Personal and Work).
2. **Drag and drop.** Remotes are dragged into folders, out of them, and
   reordered.
3. **Sort mode.** Custom order (from dragging), alphabetical, or reverse
   alphabetical.
4. **Collapsible folders.** A folder folds and unfolds like a file-tree folder.
5. **Folder look.** A folder can carry an icon and a banner image, so groups are
   easy to tell apart.
6. **Kept by Herdr.** Folders, membership, order and look are stored in Herdr's
   own shared state, so they survive restarts.
7. **Agents by remote.** The Agents section lists each remote's sessions under
   that remote, with each session's subject.
8. **Multi-line rows.** Long session subjects wrap onto more lines instead of
   being cut off.
9. **Rename a session.** Renaming uses Herdr's own tab rename.

Standing rule from the user: where Herdr already provides a feature, use it,
unless the idea does not fit it.

## Skeleton sentence (draft, waiting on the user)

> In Herdr's sidebar I make a "Work" folder with an icon, drag
> desk-work into it, fold and unfold it, and after Herdr restarts the
> Spaces section still shows desk-work's spaces inside the Work folder in
> my custom order; the Agents section lists every remote's sessions under that
> remote, each with its full subject wrapped onto more lines; and renaming one
> of those sessions there changes its name in Herdr.

## Behavior entries

- behavior: the "+ folder" button makes a new, empty, named folder in Spaces
- behavior: dropping a remote on a folder moves it into that folder
- behavior: dropping a remote between two others puts it at that position
- behavior: custom sort keeps the dragged order; alphabetical and reverse
  alphabetical ignore it without erasing it
- behavior: folding a folder hides its remotes and keeps the folder header
- behavior: a folder shows its icon and its banner image
- behavior: folders, membership, order, fold state and look survive a restart
- behavior: Agents lists sessions grouped under their remote machine
- behavior: a session row wraps a long subject instead of cutting it off
- behavior: renaming a session from Agents runs Herdr's tab rename

## Phases

- Setup [depends-on: none | parallel-safe: no | agent-suitable: no |
  shared-artifacts: PLAN.md, package.json, biome.json, tsconfig.json]
  - [x] create the folder and a colocated jj repository
  - [x] write this plan
  - [ ] settle the skeleton sentence with the user
- Walking skeleton [depends-on: Setup | parallel-safe: no | agent-suitable: no |
  shared-artifacts: everything]
  - tasks written when this phase starts

## Definition of Done

- [ ] full testing cycle passes (test, typecheck, test, build)
- [ ] `herdr-app check` passes for every mod
- [ ] verified in the running Herdr window, screenshots taken
- [ ] security scan output in the session
