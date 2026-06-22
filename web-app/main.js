import { LEVELS } from "./levels.js";
import Sokoban from "./sokoban.js";

let session = Sokoban.createSession(LEVELS);
let state = session.state;

const boardElement = document.querySelector("#board");
const levelElement = document.querySelector("#level");
const movesElement = document.querySelector("#moves");
const bestMovesElement = document.querySelector("#best-moves");
const messageElement = document.querySelector("#message");

const restartButton = document.querySelector("#restart");
const nextButton = document.querySelector("#next");
const undoButton = document.querySelector("#undo");

const modalElement = document.querySelector("#complete-modal");
const modalSummaryElement = document.querySelector("#modal-summary");
const modalReplayButton = document.querySelector("#modal-replay");
const modalNextButton = document.querySelector("#modal-next");
const modalTitleElement = document.querySelector(".modal-card h2");

function render() {
  boardElement.innerHTML = "";

  boardElement.style.gridTemplateColumns =
    `repeat(${state.width}, 64px)`;

  boardElement.style.gridTemplateRows =
    `repeat(${state.height}, 64px)`;

  levelElement.textContent = state.levelName;
  movesElement.textContent = `Moves: ${state.moves}`;
  bestMovesElement.textContent = state.bestMoves
    ? `Best Moves: ${state.bestMoves}`
    : "";
  messageElement.innerHTML = (state.hint || "").replace("\n", "<br>");
  messageElement.classList.toggle("hidden", !state.hint);

  if (state.won) {
    const bestMoveText = state.bestMoves
      ? ` Best: ${state.bestMoves}.`
      : "";

    if (session.currentLevelIndex === LEVELS.length - 1) {
      modalTitleElement.textContent = "Game Complete!";
      modalSummaryElement.textContent =
        `You completed all levels! Final level moves: ${state.moves}`;
      modalNextButton.textContent = "Back to Level 1";
    } else {
      modalTitleElement.textContent = "Level Complete!";
      modalSummaryElement.textContent =
        `Completed in ${state.moves} moves`;
      modalNextButton.textContent = "Next Level";
    }

    modalElement.classList.remove("hidden");
  } else {
    modalElement.classList.add("hidden");
  }

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const position = { x, y };
      const cell = document.createElement("div");

      cell.classList.add("cell");

      if (Sokoban.hasPosition(state.walls, position)) {
        cell.classList.add("wall");
      } else {
        cell.classList.add("ground");
      }

      if (Sokoban.hasPosition(state.switches, position)) {
        cell.classList.add("switch");
      }

      if (Sokoban.hasPosition(state.doors, position)) {
        cell.classList.add(Sokoban.isDoorOpen(state) ? "door-open" : "door-closed");
      }

      const target = Sokoban.getTargetAt(state, position);
      const box = Sokoban.getBoxAt(state, position);

      if (target) {
        cell.classList.add(`${target.type}-target`);
      }

      if (box) {
        cell.classList.add(`${box.type}-box`);
      }

      if (Sokoban.isBoxCorrectlyPlaced(state, position)) {
        cell.classList.remove(`${box.type}-box`);
        cell.classList.add(`${box.type}-box-on-target`);
      }

      if (state.player.x === x && state.player.y === y) {
        cell.classList.add(`player-${state.playerDirection}`);
      }

      boardElement.appendChild(cell);
    }
  }
}

function handleKeyDown(event) {
  const keyToDirection = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right"
  };

  const direction = keyToDirection[event.key];

  if (direction) {
    event.preventDefault();
    state = Sokoban.movePlayer(state, direction);
    session = { ...session, state };
    render();
    return;
  }

  if (event.key === "r") {
    restartLevel();
  }

  if (event.key === "n") {
    nextLevel();
  }

  if (event.key === "z") {
    undoCurrentMove();
  }
}

function restartLevel() {
  session = Sokoban.restartLevel(LEVELS, session);
  state = session.state;
  render();
}

function nextLevel() {
  session = Sokoban.nextLevel(LEVELS, session);
  state = session.state;
  render();
}

function undoCurrentMove() {
  state = Sokoban.undoMove(state);
  session = { ...session, state };
  render();
}

document.addEventListener("keydown", handleKeyDown);

restartButton.addEventListener("click", restartLevel);
nextButton.addEventListener("click", nextLevel);
undoButton.addEventListener("click", undoCurrentMove);

modalReplayButton.addEventListener("click", restartLevel);
modalNextButton.addEventListener("click", nextLevel);

render();
