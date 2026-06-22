import assert from "node:assert/strict";
import { LEVELS } from "../levels.js";
import Sokoban, {
  createGame,
  createSession,
  getBoxAt,
  getTargetAt,
  hasPosition,
  isBoxCorrectlyPlaced,
  isDoorOpen,
  isWin,
  movePlayer,
  nextLevel,
  restartLevel,
  undoMove
} from "../sokoban.js";

const openMoveLevel = {
  name: "Open movement test",
  map: [
    "WWWWW",
    "WP..W",
    "W...W",
    "WWWWW"
  ]
};

const upMoveLevel = {
  name: "Up movement test",
  map: [
    "WWWWW",
    "W...W",
    "W.P.W",
    "WWWWW"
  ]
};

const downMoveLevel = {
  name: "Down movement test",
  map: [
    "WWWWW",
    "WP..W",
    "W...W",
    "WWWWW"
  ]
};

const leftMoveLevel = {
  name: "Left movement test",
  map: [
    "WWWWW",
    "W..PW",
    "W...W",
    "WWWWW"
  ]
};

const wallLevel = {
  name: "Wall test",
  map: [
    "WWW",
    "WPW",
    "WWW"
  ]
};

const pushLevel = {
  name: "Push test",
  bestMoves: 1,
  map: [
    "WWWWW",
    "WPB.W",
    "W..TW",
    "WWWWW"
  ]
};

const blockedBoxLevel = {
  name: "Blocked box test",
  map: [
    "WWWWW",
    "WPBWW",
    "W...W",
    "WWWWW"
  ]
};

const blockedByBoxLevel = {
  name: "Blocked by box test",
  map: [
    "WWWWWW",
    "WPBB.W",
    "W....W",
    "WWWWWW"
  ]
};

const simpleWinLevel = {
  name: "Simple win test",
  map: [
    "WWWWW",
    "WPBTW",
    "WWWWW"
  ]
};

const colourWinLevel = {
  name: "Colour win test",
  map: [
    "WWWWW",
    "WPrRW",
    "WWWWW"
  ]
};

const wrongColourLevel = {
  name: "Wrong colour test",
  map: [
    "WWWWW",
    "WPuRW",
    "WWWWW"
  ]
};

const doorLevel = {
  name: "Door and switch test",
  map: [
    "WWWWWWW",
    "WPBDS.W",
    "W.....W",
    "WWWWWWW"
  ]
};

describe("Sokoban game module", function () {
  describe("public API", function () {
    it("exposes the game rules through a frozen API object", function () {
      const publicFunctions = {
        createGame,
        createSession,
        restartLevel,
        nextLevel,
        movePlayer,
        isDoorOpen,
        undoMove,
        isWin,
        getBoxAt,
        getTargetAt,
        isBoxCorrectlyPlaced,
        hasPosition
      };

      assert.equal(Object.isFrozen(Sokoban), true, "public API should be frozen");

      Object.entries(publicFunctions).forEach(([name, fn]) => {
        assert.equal(Sokoban[name], fn, `default API should expose ${name}`);
      });
    });
  });

  describe("level sessions", function () {
    const levels = [openMoveLevel, pushLevel];

    it("starts a session on the requested level", function () {
      const session = createSession(levels, 1);

      assert.equal(session.currentLevelIndex, 1, "session should record the selected level");
      assert.equal(session.state.levelName, "Push test", "session should create that level's game state");
    });

    it("restarts the current level without changing the level index", function () {
      const session = createSession(levels, 1);
      const movedSession = {
        ...session,
        state: movePlayer(session.state, "right")
      };
      const restartedSession = restartLevel(levels, movedSession);

      assert.equal(restartedSession.currentLevelIndex, 1, "restart should keep the current level");
      assert.equal(restartedSession.state.moves, 0, "restart should reset the move count");
      assert.deepEqual(restartedSession.state.player, { x: 1, y: 1 }, "restart should restore the level start");
    });

    it("moves to the next level and wraps back after the final level", function () {
      const firstSession = createSession(levels);
      const secondSession = nextLevel(levels, firstSession);
      const wrappedSession = nextLevel(levels, secondSession);

      assert.equal(secondSession.currentLevelIndex, 1, "next level should advance the level index");
      assert.equal(secondSession.state.levelName, "Push test", "next level should create the next game state");
      assert.equal(wrappedSession.currentLevelIndex, 0, "next level should wrap after the final level");
      assert.equal(wrappedSession.state.levelName, "Open movement test", "wrapped session should return to level one");
    });
  });

  describe("createGame", function () {
    it("uses only documented map symbols in the playable levels", function () {
      const documentedSymbols = new Set(["W", "P", "B", "T", "r", "R", "u", "U", "S", "D", "F", "."]);

      LEVELS.forEach((level) => {
        level.map.forEach((row) => {
          [...row].forEach((cell) => {
            assert.equal(documentedSymbols.has(cell), true, `${level.name} should not use undocumented symbol ${cell}`);
          });
        });
      });
    });

    it("defines a best move target for each playable level", function () {
      LEVELS.forEach((level) => {
        assert.equal(typeof level.bestMoves, "number", `${level.name} should define bestMoves`);
        assert.equal(level.bestMoves > 0, true, `${level.name} bestMoves should be positive`);
      });
    });

    it("creates an initial state from a level map", function () {
      const state = createGame(pushLevel);

      assert.equal(state.levelName, "Push test", "level name should be copied into state");
      assert.deepEqual(state.player, { x: 1, y: 1 }, "player should start at the P tile");
      assert.equal(state.boxes.length, 1, "one box should be parsed from the map");
      assert.equal(state.targets.length, 1, "one target should be parsed from the map");
      assert.equal(state.bestMoves, 1, "best move target should be copied into state");
      assert.equal(state.moves, 0, "new games should start with zero moves");
      assert.equal(state.won, false, "new games should not start as won");
      assert.deepEqual(state.history, [], "new games should start with empty history");
    });
  });

  describe("movePlayer", function () {
    [
      {
        direction: "up",
        level: upMoveLevel,
        expectedPlayer: { x: 2, y: 1 }
      },
      {
        direction: "down",
        level: downMoveLevel,
        expectedPlayer: { x: 1, y: 2 }
      },
      {
        direction: "left",
        level: leftMoveLevel,
        expectedPlayer: { x: 2, y: 1 }
      },
      {
        direction: "right",
        level: openMoveLevel,
        expectedPlayer: { x: 2, y: 1 }
      }
    ].forEach(({ direction, level, expectedPlayer }) => {
      it(`allows the player to move ${direction} into empty ground`, function () {
        const state = createGame(level);
        const nextState = movePlayer(state, direction);

        assert.deepEqual(nextState.player, expectedPlayer, `player should move one tile ${direction}`);
        assert.equal(nextState.moves, 1, "successful movement should increase move count");
        assert.equal(nextState.history.length, 1, "successful movement should save history for undo");
      });
    });

    it("records movement without changing the original state", function () {
      const state = createGame(openMoveLevel);
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 2, y: 1 }, "player should move one tile right");
      assert.equal(nextState.moves, 1, "successful movement should increase move count");
      assert.equal(nextState.history.length, 1, "successful movement should save history for undo");
      assert.deepEqual(state.player, { x: 1, y: 1 }, "original state should not be mutated");
    });

    it("does not move the player through a wall", function () {
      const state = createGame(wallLevel);
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 1, y: 1 }, "player should stay in place when blocked by a wall");
      assert.equal(nextState.moves, 0, "blocked movement should not increase move count");
      assert.equal(nextState.history.length, 0, "blocked movement should not be saved in history");
      assert.equal(nextState.playerDirection, "right", "blocked movement should still update facing direction");
    });

    it("pushes a box when the tile behind the box is free", function () {
      const state = createGame(pushLevel);
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 2, y: 1 }, "player should move into the old box tile");
      assert.deepEqual(getBoxAt(nextState, { x: 3, y: 1 }), { x: 3, y: 1, type: "normal" }, "box should be pushed one tile right");
      assert.equal(nextState.moves, 1, "successful box push should increase move count");
    });

    it("does not push a box into a wall", function () {
      const state = createGame(blockedBoxLevel);
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 1, y: 1 }, "player should stay in place when the box cannot move");
      assert.deepEqual(getBoxAt(nextState, { x: 2, y: 1 }), { x: 2, y: 1, type: "normal" }, "box should stay in its original position");
      assert.equal(nextState.moves, 0, "blocked box push should not increase move count");
    });

    it("does not push a box into another box", function () {
      const state = createGame(blockedByBoxLevel);
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 1, y: 1 }, "player should stay in place when the next box cannot move");
      assert.deepEqual(getBoxAt(nextState, { x: 2, y: 1 }), { x: 2, y: 1, type: "normal" }, "first box should stay in place");
      assert.deepEqual(getBoxAt(nextState, { x: 3, y: 1 }), { x: 3, y: 1, type: "normal" }, "second box should stay in place");
      assert.equal(nextState.moves, 0, "blocked push should not increase move count");
    });

    it("completes the level when a normal box is pushed onto a normal target", function () {
      const state = createGame(simpleWinLevel);
      const nextState = movePlayer(state, "right");

      assert.equal(nextState.won, true, "level should be won when the normal target has a normal box");
      assert.equal(isWin(nextState), true, "isWin should report the completed level");
    });

    it("requires coloured boxes to match coloured targets", function () {
      const correctState = movePlayer(createGame(colourWinLevel), "right");
      const wrongState = movePlayer(createGame(wrongColourLevel), "right");

      assert.equal(correctState.won, true, "red box on red target should complete the level");
      assert.equal(wrongState.won, false, "blue box on red target should not complete the level");
    });

    it("does not advance the game after the level is complete", function () {
      const completedState = movePlayer(createGame(simpleWinLevel), "right");
      const nextState = movePlayer(completedState, "left");

      assert.deepEqual(nextState.player, completedState.player, "completed level should keep the player in place");
      assert.deepEqual(nextState.boxes, completedState.boxes, "completed level should keep boxes in place");
      assert.equal(nextState.moves, completedState.moves, "completed level should not count extra moves");
      assert.equal(nextState.playerDirection, "left", "completed level can still update the facing direction");
    });
  });

  describe("doors and switches", function () {
    it("keeps doors closed when no box is on a switch", function () {
      const state = createGame(doorLevel);

      assert.equal(isDoorOpen(state), false, "door should start closed when the switch is empty");
      assert.equal(hasPosition(state.doors, { x: 3, y: 1 }), true, "door tile should be parsed from the map");
    });

    it("opens doors when a box is on a switch", function () {
      const state = createGame(doorLevel);
      const withBoxOnSwitch = {
        ...state,
        boxes: [{ x: 4, y: 1, type: "normal" }]
      };

      assert.equal(isDoorOpen(withBoxOnSwitch), true, "door should open when any box is on a switch");
    });

    it("blocks movement through a closed door", function () {
      const state = createGame(doorLevel);
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 1, y: 1 }, "player should not move because the box cannot be pushed into a closed door");
      assert.equal(nextState.moves, 0, "blocked door movement should not count as a move");
    });

    it("allows movement through an open door", function () {
      const state = {
        ...createGame(doorLevel),
        player: { x: 2, y: 1 },
        boxes: [{ x: 4, y: 1, type: "normal" }]
      };
      const nextState = movePlayer(state, "right");

      assert.deepEqual(nextState.player, { x: 3, y: 1 }, "player should move through a door while the switch is held");
      assert.equal(nextState.moves, 1, "movement through an open door should count as a move");
    });
  });

  describe("board lookups", function () {
    it("finds boxes and targets by board position", function () {
      const state = createGame(pushLevel);

      assert.deepEqual(getBoxAt(state, { x: 2, y: 1 }), { x: 2, y: 1, type: "normal" }, "box lookup should return the box on that tile");
      assert.deepEqual(getTargetAt(state, { x: 3, y: 2 }), { x: 3, y: 2, type: "normal" }, "target lookup should return the target on that tile");
      assert.equal(getBoxAt(state, { x: 1, y: 1 }), undefined, "box lookup should return undefined on an empty tile");
      assert.equal(getTargetAt(state, { x: 1, y: 1 }), undefined, "target lookup should return undefined on an empty tile");
    });

    it("reports whether a box is on the matching target", function () {
      const completedState = movePlayer(createGame(simpleWinLevel), "right");
      const wrongColourState = movePlayer(createGame(wrongColourLevel), "right");

      assert.equal(isBoxCorrectlyPlaced(completedState, { x: 3, y: 1 }), true, "matching box and target should be correct");
      assert.equal(isBoxCorrectlyPlaced(wrongColourState, { x: 3, y: 1 }), false, "wrong coloured box and target should not be correct");
      assert.equal(isBoxCorrectlyPlaced(completedState, { x: 1, y: 1 }), false, "empty tile should not be correct");
    });
  });

  describe("undoMove", function () {
    it("restores the previous state after a successful move", function () {
      const state = createGame(pushLevel);
      const movedState = movePlayer(state, "right");
      const undoneState = undoMove(movedState);

      assert.deepEqual(undoneState.player, state.player, "undo should restore the previous player position");
      assert.deepEqual(undoneState.boxes, state.boxes, "undo should restore previous box positions");
      assert.equal(undoneState.moves, 0, "undo should restore the previous move count");
      assert.equal(undoneState.history.length, 0, "undo should remove one history entry");
    });

    it("returns the same state when there is no move to undo", function () {
      const state = createGame(openMoveLevel);
      const undoneState = undoMove(state);

      assert.equal(undoneState, state, "undo with empty history should return the same state object");
    });
  });
});
