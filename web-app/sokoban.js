/**
 * Sokoban game logic module.
 *
 * This file contains only pure game-state logic. It does not read from or write
 * to the DOM. The UI in main.js imports the frozen API object and renders the
 * result.
 *
 * @module game
 */

/**
 * Create a playable game state from a level description.
 *
 * @param {Object} level - Level data from levels.js.
 * @param {string} level.name - Display name of the level.
 * @param {string[]} level.map - Grid map using W, P, B, T, r, u, R, U, S and D.
 * @param {string} [level.hint] - Optional hint shown by the UI.
 * @param {number} [level.bestMoves] - Optional best known move count.
 * @returns {Object} Initial game state.
 */
const Sokoban = Object.create(null);

Sokoban.createGame = function createGame(level) {
  const state = parseLevel(level);

  return {
    ...state,
    levelName: level.name,
    hint: level.hint || "",
    bestMoves: level.bestMoves || null,
    moves: 0,
    won: false,
    playerDirection: "down",
    history: []
  };
};

/**
 * Create an application session for a list of levels.
 *
 * @param {Object[]} levels - Level data objects.
 * @param {number} [levelIndex=0] - Index of the starting level.
 * @returns {{currentLevelIndex: number, state: Object}} Session state.
 */
Sokoban.createSession = function createSession(levels, levelIndex = 0) {
  return {
    currentLevelIndex: levelIndex,
    state: Sokoban.createGame(levels[levelIndex])
  };
};

/**
 * Restart the current level in a session.
 *
 * @param {Object[]} levels - Level data objects.
 * @param {{currentLevelIndex: number}} session - Current session.
 * @returns {{currentLevelIndex: number, state: Object}} Restarted session.
 */
Sokoban.restartLevel = function restartLevel(levels, session) {
  return {
    currentLevelIndex: session.currentLevelIndex,
    state: Sokoban.createGame(levels[session.currentLevelIndex])
  };
};

/**
 * Advance to the next level, wrapping back to level one after the final level.
 *
 * @param {Object[]} levels - Level data objects.
 * @param {{currentLevelIndex: number}} session - Current session.
 * @returns {{currentLevelIndex: number, state: Object}} Next-level session.
 */
Sokoban.nextLevel = function nextLevel(levels, session) {
  const nextLevelIndex =
    session.currentLevelIndex < levels.length - 1
      ? session.currentLevelIndex + 1
      : 0;

  return {
    currentLevelIndex: nextLevelIndex,
    state: Sokoban.createGame(levels[nextLevelIndex])
  };
};

/**
 * Move the player in one direction and return the next game state.
 *
 * If the move is blocked, the state is returned with only the player direction
 * updated. If the player pushes a valid box, the box is moved too.
 *
 * @param {Object} state - Current game state.
 * @param {("up"|"down"|"left"|"right")} direction - Direction to move.
 * @returns {Object} New game state.
 */
Sokoban.movePlayer = function movePlayer(state, direction) {
  if (state.won) {
    return {
      ...state,
      playerDirection: direction
    };
  }

  const step = getStep(direction);
  const nextPlayer = addPositions(state.player, step);

  if (isBlockedForMovement(state, nextPlayer)) {
    return {
      ...state,
      playerDirection: direction
    };
  }

  const boxIndex = findPositionIndex(state.boxes, nextPlayer);

  if (boxIndex === -1) {
    const nextState = {
      ...state,
      history: saveHistory(state),
      player: nextPlayer,
      moves: state.moves + 1,
      playerDirection: direction
    };

    return {
      ...nextState,
      won: Sokoban.isWin(nextState)
    };
  }

  const nextBox = addPositions(nextPlayer, step);

  if (
    isBlockedForMovement(state, nextBox) ||
    Sokoban.hasPosition(state.boxes, nextBox)
  ) {
    return {
      ...state,
      playerDirection: direction
    };
  }

  const boxes = state.boxes.map((box, index) => {
    if (index === boxIndex) {
      return {
        ...box,
        x: nextBox.x,
        y: nextBox.y
      };
    }

    return box;
  });

  const nextState = {
    ...state,
    history: saveHistory(state),
    player: nextPlayer,
    boxes,
    moves: state.moves + 1,
    playerDirection: direction
  };

  return {
    ...nextState,
    won: Sokoban.isWin(nextState)
  };
};

/**
 * Return whether the door tiles are open.
 *
 * A door is open when at least one box is on a switch tile.
 *
 * @param {Object} state - Current game state.
 * @returns {boolean} True when doors should be passable.
 */
Sokoban.isDoorOpen = function isDoorOpen(state) {
  return state.switches.some((switchTile) => {
    return Sokoban.hasPosition(state.boxes, switchTile);
  });
};

/**
 * Undo the most recent successful move.
 *
 * Blocked moves are not saved in history, so they cannot be undone.
 *
 * @param {Object} state - Current game state.
 * @returns {Object} Previous game state, or the same state if no history exists.
 */
Sokoban.undoMove = function undoMove(state) {
  if (state.history.length === 0) {
    return state;
  }

  const previous = state.history[state.history.length - 1];

  return {
    ...state,
    player: { ...previous.player },
    boxes: previous.boxes.map((box) => ({ ...box })),
    moves: previous.moves,
    won: previous.won,
    playerDirection: previous.playerDirection,
    history: state.history.slice(0, -1)
  };
};

/**
 * Check whether every target has a matching box on it.
 *
 * Normal boxes must be on normal targets. Red boxes must be on red targets.
 * Blue boxes must be on blue targets.
 *
 * @param {Object} state - Current game state.
 * @returns {boolean} True when the level is complete.
 */
Sokoban.isWin = function isWin(state) {
  if (state.targets.length === 0) {
    return false;
  }

  return state.targets.every((target) => {
    const box = state.boxes.find((item) => {
      return item.x === target.x && item.y === target.y;
    });

    return Boolean(box && box.type === target.type);
  });
};

/**
 * Get the box on a position, if one exists.
 *
 * @param {Object} state - Current game state.
 * @param {{x: number, y: number}} position - Board position.
 * @returns {Object|undefined} Matching box or undefined.
 */
Sokoban.getBoxAt = function getBoxAt(state, position) {
  return state.boxes.find((box) => {
    return box.x === position.x && box.y === position.y;
  });
};

/**
 * Get the target on a position, if one exists.
 *
 * @param {Object} state - Current game state.
 * @param {{x: number, y: number}} position - Board position.
 * @returns {Object|undefined} Matching target or undefined.
 */
Sokoban.getTargetAt = function getTargetAt(state, position) {
  return state.targets.find((target) => {
    return target.x === position.x && target.y === position.y;
  });
};

/**
 * Check whether a box is on the matching target type.
 *
 * @param {Object} state - Current game state.
 * @param {{x: number, y: number}} position - Board position.
 * @returns {boolean} True when a matching box and target overlap.
 */
Sokoban.isBoxCorrectlyPlaced = function isBoxCorrectlyPlaced(state, position) {
  const box = Sokoban.getBoxAt(state, position);
  const target = Sokoban.getTargetAt(state, position);

  return Boolean(box && target && box.type === target.type);
};

/**
 * Check whether a list of positions contains a position.
 *
 * @param {Array<{x: number, y: number}>} positions - Positions to search.
 * @param {{x: number, y: number}} position - Position to find.
 * @returns {boolean} True when the position exists in the list.
 */
Sokoban.hasPosition = function hasPosition(positions, position) {
  return positions.some((item) => {
    return item.x === position.x && item.y === position.y;
  });
};

function parseLevel(level) {
  const walls = [];
  const targets = [];
  const boxes = [];
  const switches = [];
  const doors = [];
  let player = null;

  level.map.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      const position = { x, y };

      if (cell === "W") {
        walls.push(position);
      }

      if (cell === "T") {
        targets.push({ ...position, type: "normal" });
      }

      if (cell === "R") {
        targets.push({ ...position, type: "red" });
      }

      if (cell === "U") {
        targets.push({ ...position, type: "blue" });
      }

      if (cell === "B") {
        boxes.push({ ...position, type: "normal" });
      }

      if (cell === "r") {
        boxes.push({ ...position, type: "red" });
      }

      if (cell === "u") {
        boxes.push({ ...position, type: "blue" });
      }

      if (cell === "S") {
        switches.push(position);
      }

      if (cell === "D") {
        doors.push(position);
      }

      if (cell === "P") {
        player = position;
      }
    });
  });

  return {
    width: level.map[0].length,
    height: level.map.length,
    walls,
    targets,
    boxes,
    switches,
    doors,
    player
  };
}

function isBlockedForMovement(state, position) {
  if (Sokoban.hasPosition(state.walls, position)) {
    return true;
  }

  if (Sokoban.hasPosition(state.doors, position) && !Sokoban.isDoorOpen(state)) {
    return true;
  }

  return false;
}

function saveHistory(state) {
  return [
    ...state.history,
    {
      player: { ...state.player },
      boxes: state.boxes.map((box) => ({ ...box })),
      moves: state.moves,
      won: state.won,
      playerDirection: state.playerDirection
    }
  ];
}

function findPositionIndex(positions, position) {
  return positions.findIndex((item) => {
    return item.x === position.x && item.y === position.y;
  });
}

function addPositions(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

function getStep(direction) {
  if (direction === "up") {
    return { x: 0, y: -1 };
  }

  if (direction === "down") {
    return { x: 0, y: 1 };
  }

  if (direction === "left") {
    return { x: -1, y: 0 };
  }

  if (direction === "right") {
    return { x: 1, y: 0 };
  }

  return { x: 0, y: 0 };
}

const frozenSokoban = Object.freeze(Sokoban);

export const createGame = frozenSokoban.createGame;
export const createSession = frozenSokoban.createSession;
export const restartLevel = frozenSokoban.restartLevel;
export const nextLevel = frozenSokoban.nextLevel;
export const movePlayer = frozenSokoban.movePlayer;
export const isDoorOpen = frozenSokoban.isDoorOpen;
export const undoMove = frozenSokoban.undoMove;
export const isWin = frozenSokoban.isWin;
export const getBoxAt = frozenSokoban.getBoxAt;
export const getTargetAt = frozenSokoban.getTargetAt;
export const isBoxCorrectlyPlaced = frozenSokoban.isBoxCorrectlyPlaced;
export const hasPosition = frozenSokoban.hasPosition;

export default frozenSokoban;
