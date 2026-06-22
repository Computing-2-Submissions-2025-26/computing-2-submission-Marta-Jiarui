# Sokoban Game Module API Specification

This document specifies the public API for `sokoban.js`, the pure JavaScript game module used by the web application.

The module represents Sokoban as immutable game state. UI code should call the frozen `Sokoban` API object and render the returned state. The module does not use the DOM.

```js
import Sokoban from "./sokoban.js";
```

## State shape

A game state contains:

```js
{
  width: number,
  height: number,
  levelName: string,
  hint: string,
  bestMoves: number | null,
  walls: Array<{ x: number, y: number }>,
  targets: Array<{ x: number, y: number, type: "normal" | "red" | "blue" }>,
  boxes: Array<{ x: number, y: number, type: "normal" | "red" | "blue" }>,
  switches: Array<{ x: number, y: number }>,
  doors: Array<{ x: number, y: number }>,
  player: { x: number, y: number },
  playerDirection: "up" | "down" | "left" | "right",
  moves: number,
  won: boolean,
  history: Array<Object>
}
```

## Level format

A level is an object:

```js
{
  name: string,
  hint?: string,
  bestMoves?: number,
  map: string[]
}
```

Map symbols:

| Symbol | Meaning |
|---|---|
| `W` | Wall |
| `P` | Player start |
| `B` | Normal box |
| `T` | Normal target |
| `r` | Red box |
| `R` | Red target |
| `u` | Blue box |
| `U` | Blue target |
| `S` | Switch |
| `D` | Door |
| `F` | Floor |
| `.` | Ground |

## Functions

The default export is a frozen API object. Named exports are also available for tests and direct imports.

### `createGame(level)`

Creates a new playable game state from a level description.

**Parameters**

- `level` `{Object}`: Level data.

**Returns**

- `{Object}`: Initial game state.

**Behaviour**

- Parses walls, targets, boxes, switches, doors and player position.
- Sets `moves` to `0`.
- Copies `bestMoves` from the level, or uses `null`.
- Sets `won` to `false`.
- Sets `playerDirection` to `"down"`.
- Sets `history` to an empty array.

---

### `createSession(levels, levelIndex = 0)`

Creates a game session for a list of levels.

**Parameters**

- `levels` `{Object[]}`: Level data.
- `levelIndex` `{number}`: Optional starting level index.

**Returns**

- `{Object}`: Session object containing `currentLevelIndex` and `state`.

**Behaviour**

- Starts on the requested level, or level `0` by default.
- Creates the playable state for that level.

---

### `restartLevel(levels, session)`

Restarts the current level in a session.

**Parameters**

- `levels` `{Object[]}`: Level data.
- `session` `{Object}`: Current session object.

**Returns**

- `{Object}`: Session object with the same level index and a fresh state.

---

### `nextLevel(levels, session)`

Moves to the next level in a session.

**Parameters**

- `levels` `{Object[]}`: Level data.
- `session` `{Object}`: Current session object.

**Returns**

- `{Object}`: Session object for the next level.

**Behaviour**

- Advances by one level when another level exists.
- Wraps back to level `0` after the final level.

---

### `movePlayer(state, direction)`

Moves the player in one direction and returns a new state.

**Parameters**

- `state` `{Object}`: Current game state.
- `direction` `"up" | "down" | "left" | "right"`: Movement direction.

**Returns**

- `{Object}`: Updated game state.

**Behaviour**

- Moving into empty ground changes the player position and increments `moves`.
- Moving into a wall does not move the player and does not increment `moves`.
- Moving into a closed door does not move the player and does not increment `moves`.
- Moving into a box pushes the box if the tile behind it is free.
- A box cannot be pushed into a wall, closed door, or another box.
- After a successful move, the previous state is saved in `history`.
- After a successful move, the win condition is checked.
- If the game is already won, the state is not advanced.

---

### `undoMove(state)`

Restores the most recent successful move.

**Parameters**

- `state` `{Object}`: Current game state.

**Returns**

- `{Object}`: Previous game state, or the same state if there is no history.

**Behaviour**

- Restores player position, box positions, move count, win state and player direction.
- Removes one entry from `history`.
- Blocked moves are not stored in history, so they cannot be undone.

---

### `isWin(state)`

Checks whether the level has been completed.

**Parameters**

- `state` `{Object}`: Current game state.

**Returns**

- `{boolean}`: `true` when all targets are covered by matching boxes.

**Behaviour**

- Normal boxes must be on normal targets.
- Red boxes must be on red targets.
- Blue boxes must be on blue targets.
- A coloured box on the wrong coloured target does not count as a win.

---

### `isDoorOpen(state)`

Checks whether doors are open.

**Parameters**

- `state` `{Object}`: Current game state.

**Returns**

- `{boolean}`: `true` if at least one box is on a switch.

**Behaviour**

- Door tiles are passable only while a box is on a switch.

---

### `getBoxAt(state, position)`

Gets the box at a position.

**Parameters**

- `state` `{Object}`: Current game state.
- `position` `{ x: number, y: number }`: Board position.

**Returns**

- `{Object | undefined}`: Box at the position, if present.

---

### `getTargetAt(state, position)`

Gets the target at a position.

**Parameters**

- `state` `{Object}`: Current game state.
- `position` `{ x: number, y: number }`: Board position.

**Returns**

- `{Object | undefined}`: Target at the position, if present.

---

### `isBoxCorrectlyPlaced(state, position)`

Checks whether a box and a target of the same type overlap.

**Parameters**

- `state` `{Object}`: Current game state.
- `position` `{ x: number, y: number }`: Board position.

**Returns**

- `{boolean}`: `true` when the position contains a box on a matching target.

---

### `hasPosition(positions, position)`

Checks whether a position exists in a list.

**Parameters**

- `positions` `Array<{ x: number, y: number }>`: Positions to search.
- `position` `{ x: number, y: number }`: Position to find.

**Returns**

- `{boolean}`: `true` when the position exists in the list.
