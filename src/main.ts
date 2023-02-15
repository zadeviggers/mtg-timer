import "./style.css";

import { Rive } from "@rive-app/canvas";

import pauseButtonRivFile from "./pause_button.riv?url";

type Player = {
	id: number;
	timeRemaining: number;
	timerButtonEl: HTMLButtonElement;
	timeDisplayEl: HTMLElement;
};

const openMenuButton = document.getElementById(
	"menu-button"
) as HTMLButtonElement;
const mainMenu = document.getElementById("main-menu") as HTMLDialogElement;
const closeMenuButton = document.getElementById(
	"close-button"
) as HTMLButtonElement;
const pauseButton = document.getElementById(
	"pause-button"
) as HTMLButtonElement;
const toggleFullscreenButton = document.getElementById(
	"toggle-fullscreen"
) as HTMLButtonElement;
const toggleFullscreenButtonText = document.getElementById(
	"toggle-fullscreen-text"
) as HTMLElement;

const gameState: {
	isPaused: boolean;
	currentPlayers: Player[] | undefined;
	activePlayerID: number | undefined;
} = {
	isPaused: false,
	currentPlayers: [],
	activePlayerID: undefined,
};
let isPausedCallback: () => void;

const optionsForm = document.getElementById("game-settings") as HTMLFormElement;
const timersContainer = document.getElementById("timers") as HTMLElement;

const tickInterval = 10; // ms
let intervalID: ReturnType<typeof setInterval>;

// This layouts system means I can set it up so that the order of play goes around
// rather than side to side and down.
const layouts: Record<number, (ms: number) => string> = {
	1: (ms) => renderLayout([[1, "down"]], ms),
	2: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
			],
			ms
		),
	3: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
				[3, "down"],
			],
			ms
		),
	4: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
				[4, "left"],
				[3, "right"],
			],
			ms
		),
	5: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
				[5, "left"],
				[3, "right"],
				[4, "down"],
			],
			ms
		),
	6: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
				[6, "left"],
				[3, "right"],
				[5, "left"],
				[4, "right"],
			],
			ms
		),
};

setupGame({ players: 4, playerTime: 600000 });

toggleFullscreenButton.addEventListener("click", () => {
	if (document.fullscreenElement) {
		// Currently in fullscreen since fullscreenElement isn't null
		document.exitFullscreen();
	} else {
		document.documentElement.requestFullscreen();
	}
});

document.addEventListener("fullscreenchange", () => {
	// Change these based on the events, to keep in sync properly
	if (document.fullscreenElement) {
		// Currently in fullscreen since fullscreenElement isn't null
		toggleFullscreenButton.toggleAttribute("data-fullscreen", true);
		toggleFullscreenButtonText.innerText = "Exit fullscreen";
	} else {
		toggleFullscreenButton.toggleAttribute(
			"data-fullscreen",
			false
		);
		toggleFullscreenButtonText.innerText = "Go fullscreen";
	}
});

openMenuButton.addEventListener("click", () => {
	mainMenu.showModal();
});

closeMenuButton.addEventListener("click", () => {
	mainMenu.close();
});

optionsForm.addEventListener("submit", (ev) => {
	ev.preventDefault();
	const data = new FormData(optionsForm);
	setupGame({
		players: Number.parseInt(data.get("player-count")! as string),
		playerTime:
			Number(data.get("turn-time")! as string) * 60 * 1000,
	});
	mainMenu.close();
});

const pauseButtonCanvas = document.getElementById(
	"pause-button-canvas"
) as HTMLCanvasElement;
const pauseButtonRive = new Rive({
	src: pauseButtonRivFile,
	canvas: pauseButtonCanvas,
	stateMachines: "button",
	autoplay: true,
	onLoad: () => {
		const inputs = pauseButtonRive.stateMachineInputs("button");
		const pressStartTrigger = inputs.find(
			(i) => i.name === "Press start"
		);
		const pressCancelTrigger = inputs.find(
			(i) => i.name === "Press cancel"
		);
		const hoveredBoolean = inputs.find((i) => i.name === "Hovered");
		const pausedBoolean = inputs.find((i) => i.name === "Paused");

		if (pausedBoolean) {
			pausedBoolean.value = gameState.isPaused;

			isPausedCallback = () => {
				pausedBoolean.value = gameState.isPaused;
			};
		}

		if (pressStartTrigger) {
			pauseButton.addEventListener("pointerdown", () => {
				if (gameState.activePlayerID) {
					// If the game has started...
					pressStartTrigger.fire();
				}
			});
		}

		if (pressCancelTrigger) {
			// Click outside listener from https://stackoverflow.com/a/64665817
			document.addEventListener("pointerup", (event) => {
				// We'll let this one fire, even when the game hasn't started,
				// in case we need to clean up from an old game.
				const withinBoundaries = event
					.composedPath()
					.includes(pauseButton);

				if (!withinBoundaries) {
					pressCancelTrigger.fire();
				}
			});
		}

		if (hoveredBoolean) {
			pauseButton.addEventListener("pointerenter", () => {
				if (gameState.activePlayerID) {
					// If the game has started...
					hoveredBoolean.value = true;
				}
			});
			pauseButton.addEventListener("pointerleave", () => {
				if (gameState.activePlayerID) {
					// If the game has started...
					hoveredBoolean.value = false;
				}
			});
		}
	},
});

pauseButton.addEventListener("click", () => {
	gameState.isPaused = !gameState.isPaused;
	// pauseButton.toggleAttribute("data-paused", isPaused);

	if (gameState.isPaused) {
		stopTicking();
		pauseButton.setAttribute("title", "Unpause");
	} else {
		startTicking();
		pauseButton.setAttribute("title", "Pause");
	}

	isPausedCallback?.();
});

function setupGame({
	players,
	playerTime,
}: {
	players: number;
	playerTime: number;
}) {
	// Need to reset everything here

	// Clear active player ID
	gameState.activePlayerID = undefined;

	// Clear tick interval
	clearInterval(intervalID);

	// Reset paused status
	gameState.isPaused = false;

	// Disable pause button
	pauseButton.toggleAttribute("disabled", true);

	const playerIDs = Array.from(Array(players), (_, i) => ({
		id: i + 1,
		timeRemaining: playerTime,
	}));

	timersContainer.innerHTML = layouts[players](playerTime);

	gameState.currentPlayers = playerIDs.map(({ id, timeRemaining }) => ({
		id,
		timeRemaining,
		timerButtonEl: document.getElementById(
			`player-timer-button-${id}`
		) as HTMLButtonElement,
		timeDisplayEl: document.getElementById(
			`player-time-display-${id}`
		) as HTMLElement,
	}));

	gameState.currentPlayers.forEach((player) => {
		player.timerButtonEl.addEventListener(
			"click",
			createTimerButtonClickHandler(player)
		);
	});
}

function createTimerButtonClickHandler(player: Player) {
	return () => {
		// Don't switch turns when paused
		if (gameState.isPaused) return;

		// Check if there there are no active players
		if (!gameState.activePlayerID) {
			// There isn't an active timer right now,
			// so make this player the active player.
			setActivePlayer(player);

			// Start ticking
			startTicking();

			// Enable pause button
			pauseButton.toggleAttribute("disabled", false);
		} else if (gameState.activePlayerID === player.id) {
			// If there is already an active timer, set the next player ID to active
			nextPlayer();
		}
	};
}

function nextPlayer() {
	if (!gameState.currentPlayers) {
		console.warn(
			"`nextPlayer` called without currentPlayers being set"
		);
		return;
	}

	let nextPlayerID = (gameState.activePlayerID || 0) + 1;
	if (nextPlayerID > gameState.currentPlayers.length) {
		const sorted = [...gameState.currentPlayers].sort(
			(a, b) => a.id - b.id
		);
		nextPlayerID = sorted[0].id;
	}
	setActivePlayer(
		gameState.currentPlayers.find((p) => p.id === nextPlayerID)!
	);
}

function startTicking() {
	intervalID = setInterval(handleTick, tickInterval);
}

function stopTicking() {
	clearInterval(intervalID);
}

function setActivePlayer(player: Player) {
	gameState.activePlayerID = player.id;
	updateTimerUI();
}

function updateTimerUI() {
	if (!gameState.currentPlayers) {
		console.warn(
			"`updateTimerUI` called without currentPlayers being set"
		);
		return;
	}

	gameState.currentPlayers.forEach((player) => {
		player.timerButtonEl.toggleAttribute(
			"data-active",
			gameState.activePlayerID === player.id
		);
		player.timeDisplayEl.innerText = formatTime(
			player.timeRemaining
		);
	});
}

function handleTick() {
	if (!gameState.currentPlayers) {
		console.warn(
			"`handleTick` called without currentPlayers being set"
		);
		return;
	}

	const activePlayer = gameState.currentPlayers.find(
		(p) => p.id === gameState.activePlayerID
	)!;

	if (activePlayer.timeRemaining <= 0) {
		nextPlayer();
		return;
	}

	activePlayer.timeRemaining -= tickInterval;

	updateTimerUI();
}

function zeroPadded(toPad: number, maxDigits: number): string {
	return toPad.toString().padStart(maxDigits, "0");
}

function formatTime(ms: number): string {
	// Courtesy of https://stackoverflow.com/a/21294619
	const date = new Date(ms);
	const formattedTimes = [
		zeroPadded(date.getUTCMinutes(), 2),
		zeroPadded(date.getUTCSeconds(), 2),
	];

	if (date.getUTCMinutes() < 1 && date.getUTCSeconds() < 30)
		formattedTimes.push(zeroPadded(date.getUTCMilliseconds(), 3));

	if (date.getUTCHours() > 0)
		formattedTimes.unshift(zeroPadded(date.getUTCHours(), 2));

	return formattedTimes.join(":");
}

function renderLayout(
	timers: [number, "up" | "down" | "left" | "right"][],
	ms: number
): string {
	return /*html*/ `
		${timers
			.map(
				([id, rotation]) => /*html*/ `
				<button class="relative flex items-center justify-center flex-1 min-w-[40%] bg-slate-300 dark:bg-slate-600 data-[active]:bg-orange-500" id="player-timer-button-${id}">
					${
						import.meta.env.DEV
							? /*html*/ `
							<span class="absolute top-0 left-0">
								Player ${id}
							</span>`
							: ""
					}
					<span class="font-bold text-2xl select-none font-mono ${
						rotation === "down"
							? "rotate-0"
							: rotation === "up"
							? "rotate-180"
							: rotation === "left"
							? "rotate-90"
							: "-rotate-90"
					}" id="player-time-display-${id}">
						${formatTime(ms)}
					</span>
				</button>
				`
			)
			.join("\n")}
	`;
}
