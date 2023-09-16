import "./style.css";

import { Rive } from "@rive-app/canvas";

import pauseButtonRivFile from "./pause_button.riv?url";

type Player = {
	id: number;
	timeRemaining: number;
	timerButtonEl: HTMLButtonElement;
	timeDisplayEl: HTMLElement;
	koButtonEl: HTMLElement;
	out: boolean;
};

const openMenuButton = document.getElementById(
	"menu-button",
) as HTMLButtonElement;
const mainMenu = document.getElementById("main-menu") as HTMLDialogElement;
const closeMenuButton = document.getElementById(
	"close-button",
) as HTMLButtonElement;
const pauseButton = document.getElementById(
	"pause-button",
) as HTMLButtonElement;
const toggleFullscreenButton = document.getElementById(
	"toggle-fullscreen",
) as HTMLButtonElement;
const toggleFullscreenButtonText = document.getElementById(
	"toggle-fullscreen-text",
) as HTMLElement;

const gameState: {
	isPaused: boolean;
	currentPlayers: Player[] | null;
	activePlayerID: number | null;
	activePlayer: Player | null;
} = {
	isPaused: false,
	currentPlayers: [],
	activePlayerID: null,
	get activePlayer(): Player | null {
		if (this.activePlayerID === null) return null;
		return getPlayerByID(this.activePlayerID)!;
	},
};
let updatePauseButtonVisual = () => {
	console.warn(
		"updatePauseButtonVisual called before being set to new thing",
	);
};

function getPlayerByID(id: number | null): Player | null {
	return (gameState.currentPlayers ?? []).find((p) => p.id === id) ?? null;
}

// Create a reference for the Wake Lock.
let wakeLock: { release: () => Promise<unknown> } | undefined;

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
			ms,
		),
	3: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
				[3, "down"],
			],
			ms,
		),
	4: (ms) =>
		renderLayout(
			[
				[1, "left"],
				[2, "right"],
				[4, "left"],
				[3, "right"],
			],
			ms,
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
			ms,
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
			ms,
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

		if (mainMenu.open) {
			// Bring modal back to front to handle chrome and safari badness

			// Have to close it first to be able to reopen
			mainMenu.close();
			mainMenu.showModal();
		}
	} else {
		toggleFullscreenButton.toggleAttribute("data-fullscreen", false);
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
		playerTime: Number(data.get("turn-time")! as string) * 60 * 1000,
	});
	mainMenu.close();
});

const pauseButtonCanvas = document.getElementById(
	"pause-button-canvas",
) as HTMLCanvasElement;
const pauseButtonRive = new Rive({
	src: pauseButtonRivFile,
	canvas: pauseButtonCanvas,
	stateMachines: "button",
	autoplay: true,
	onLoad: () => {
		const inputs = pauseButtonRive.stateMachineInputs("button");
		const pressStartTrigger = inputs.find((i) => i.name === "Press start");
		const pressCancelTrigger = inputs.find(
			(i) => i.name === "Press cancel",
		);
		const hoveredBoolean = inputs.find((i) => i.name === "Hovered");
		const pausedBoolean = inputs.find((i) => i.name === "Paused");

		if (pausedBoolean) {
			pausedBoolean.value = gameState.isPaused;

			updatePauseButtonVisual = () => {
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

function pause() {
	gameState.isPaused = true;
	stopTicking();
	pauseButton.setAttribute("title", "Pause");
	pauseButton.toggleAttribute("disabled", false);

	updatePauseButtonVisual();
}

function unpause() {
	gameState.isPaused = false;
	startTicking();
	pauseButton.setAttribute("title", "Unpause");
	pauseButton.toggleAttribute("disabled", false);

	updatePauseButtonVisual();
}

pauseButton.addEventListener("click", () => {
	if (gameState.isPaused) {
		unpause();
	} else {
		pause();
	}
});

function setupGame({
	players,
	playerTime,
}: {
	players: number;
	playerTime: number;
}) {
	// Need to reset everything here

	// Release wakelock
	try {
		wakeLock?.release();
	} catch (err) {
		console.warn(`Failed to release wakelock: ${err}`);
	}

	// Clear active player ID
	setActivePlayer(null);

	// 'Pause' to reset stuff
	pause();

	// Disable pause button
	pauseButton.toggleAttribute("disabled", true);

	// Reset positioning
	if (players < 2) {
		pauseButton.setAttribute("style", "top:initial;bottom:10px");
	} else {
		pauseButton.removeAttribute("style");
	}

	const playerIDs = Array.from(Array(players), (_, i) => ({
		id: i + 1,
		timeRemaining: playerTime,
	}));

	timersContainer.innerHTML = layouts[players](playerTime);

	gameState.currentPlayers = playerIDs.map(({ id, timeRemaining }) => ({
		id,
		timeRemaining,
		timerButtonEl: document.getElementById(
			`player-timer-button-${id}`,
		) as HTMLButtonElement,
		timeDisplayEl: document.getElementById(
			`player-time-display-${id}`,
		) as HTMLElement,
		koButtonEl: document.getElementById(
			`player-ko-button-${id}`,
		) as HTMLButtonElement,
		get out() {
			return this.timeRemaining <= 0;
		},
	}));

	gameState.currentPlayers.forEach((player) => {
		player.timerButtonEl.addEventListener(
			"click",
			createTimerButtonClickHandler(player),
		);
		player.koButtonEl.addEventListener("click", createHandleKO(player));
	});

	// Keep the pause button sync'd
	updatePauseButtonVisual();
}

function createHandleKO(player: Player) {
	return (e: MouseEvent) => {
		// Make sure it doesn't start the main timer
		e.preventDefault();
		e.stopPropagation();

		// Make sure they didn't press the KO button by accident
		if (!confirm(`Are you sure you want to knock out player ${player.id}?`))
			return;

		// Save the time among the other players
		const timeToDistribute = player.timeRemaining;

		// Knock out the player
		player.timeRemaining = 0;

		// Distribute the time to other players
		const playersToDistributeAmongst =
			gameState.currentPlayers?.filter((player) => !player.out) ?? [];

		if (playersToDistributeAmongst.length === 0) return;

		// Calculate amount to distribute
		const amountPerPlayer =
			timeToDistribute / playersToDistributeAmongst.length;

		// Share out the time
		playersToDistributeAmongst.forEach(
			(player) => (player.timeRemaining += amountPerPlayer),
		);

		// Update the UI
		updateTimerUI();
	};
}

function createTimerButtonClickHandler(player: Player) {
	return () => {
		// Check if there there are no active players
		if (gameState.activePlayerID == null) {
			// There isn't an active timer right now,
			// so make this player the active player.
			setActivePlayer(player);

			// Start ticking
			unpause();

			// Request Wakelock
			if ("wakeLock" in navigator) {
				// create an async function to request a wake lock
				try {
					(
						navigator.wakeLock as {
							request: (arg1: "screen") => Promise<{
								release: () => Promise<unknown>;
							}>;
						}
					)
						.request("screen")
						.then((w) => {
							wakeLock = w;
						});
				} catch (err) {
					// The Wake Lock request has failed - usually system related, such as battery.
					console.warn(`Wakelock request failed: ${err}`);
				}
			} else {
				console.warn("Wakelock not available");
			}
		} else if (gameState.activePlayerID === player.id) {
			// If there is already an active timer, set the next player ID to active
			nextPlayer();
		}
	};
}

function nextPlayer() {
	if (!gameState.currentPlayers) {
		console.warn("`nextPlayer` called without currentPlayers being set");
		return;
	}

	if (allPlayersOut()) {
		pause();
		setActivePlayer(null);
		wakeLock?.release();
		pauseButton.toggleAttribute("disabled", true);
		return;
	}

	let nextPlayerID = (gameState.activePlayerID ?? 0) + 1;
	if (nextPlayerID > gameState.currentPlayers.length) {
		const sorted = [...gameState.currentPlayers].sort(
			(a, b) => a.id - b.id,
		);
		nextPlayerID = sorted[0].id;
	}
	setActivePlayer(getPlayerByID(nextPlayerID)!);
}

function startTicking() {
	// Avoid double intervals
	stopTicking();

	intervalID = setInterval(handleTick, tickInterval);
}

function stopTicking() {
	clearInterval(intervalID);
}

function setActivePlayer(player: Player | null) {
	gameState.activePlayerID = player?.id ?? null;
	updateTimerUI();
}

function updateTimerUI() {
	(gameState.currentPlayers ?? []).forEach((player) => {
		player.timerButtonEl.toggleAttribute(
			"data-active",
			gameState.activePlayerID === player.id,
		);
		player.timeDisplayEl.innerText = formatTime(player.timeRemaining);
	});
}

function allPlayersOut(): boolean {
	return (gameState.currentPlayers ?? []).findIndex((p) => !p.out) == -1;
}

function handleTick() {
	if (!gameState.currentPlayers) {
		console.warn("`handleTick` called without currentPlayers being set");
		return;
	}

	if (gameState.activePlayer?.out) {
		nextPlayer();
	} else {
		if (gameState.activePlayer)
			gameState.activePlayer.timeRemaining -= tickInterval;
	}

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
	ms: number,
): string {
	return /*html*/ `
		${timers
			.map(
				([id, rotation]) => /*html*/ `
				<div
					class="relative flex items-center justify-center flex-1 min-w-[40%] bg-slate-300 dark:bg-slate-600 data-[active]:bg-orange-500 cursor-pointer"
					id="player-timer-button-${id}"
					data-player="${id}"
					aria-role="button"
				>
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
					<button
						data-ko="${id}"
						id="player-ko-button-${id}"
						class="p-4 bg-teal-500 text-white dark:bg-slate-800 absolute ${
							rotation === "down"
								? "bottom-0 left-0"
								: rotation === "up"
								? "top-0 left-0"
								: rotation === "left"
								? "bottom-0 left-0"
								: "bottom-0 right-0"
						}"
						title="Knock out player ${id}"
					>KO</button>
				</div>
				`,
			)
			.join("\n")}
	`;
}
