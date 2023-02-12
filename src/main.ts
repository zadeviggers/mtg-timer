import "./style.css";

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
const optionsForm = document.getElementById("game-settings") as HTMLFormElement;
const timersContainer = document.getElementById("timers") as HTMLElement;

const tickInterval = 10; // ms
let intervalID: ReturnType<typeof setInterval>;

type Player = {
	id: number;
	timeRemaining: number;
	timerButtonEl: HTMLButtonElement;
	timeDisplayEl: HTMLElement;
};
let currentPlayers: Player[] = [];
let activePlayerID: number | undefined = undefined;

let isPaused = false;

// This layouts system means I can set it up so that the order of play goes around
// rather than side to side and down.
const layouts: Record<number, (ms: number) => string> = {
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

pauseButton.addEventListener("click", () => {
	isPaused = !isPaused;
	pauseButton.toggleAttribute("data-paused", isPaused);

	if (isPaused) {
		stopTicking();
		pauseButton.setAttribute("title", "Unpause");
	} else {
		startTicking();
		pauseButton.setAttribute("title", "Pause");
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

	// Clear active player ID
	activePlayerID = undefined;

	// Clear tick interval
	clearInterval(intervalID);

	// Reset paused status
	isPaused = false;

	// Disable pause button
	pauseButton.toggleAttribute("disabled", true);

	const playerIDs = Array.from(Array(players), (_, i) => ({
		id: i + 1,
		timeRemaining: playerTime,
	}));

	timersContainer.innerHTML = layouts[players](playerTime);

	currentPlayers = playerIDs.map(({ id, timeRemaining }) => ({
		id,
		timeRemaining,
		timerButtonEl: document.getElementById(
			`player-timer-button-${id}`
		) as HTMLButtonElement,
		timeDisplayEl: document.getElementById(
			`player-time-display-${id}`
		) as HTMLElement,
	}));

	currentPlayers.forEach((player) => {
		player.timerButtonEl.addEventListener(
			"click",
			createTimerButtonClickHandler(player)
		);
	});
}

function createTimerButtonClickHandler(player: Player) {
	return () => {
		// Don't switch turns when paused
		if (isPaused) return;

		// Check if there there are no active players
		if (!activePlayerID) {
			// There isn't an active timer right now,
			// so make this player the active player.
			setActivePlayer(player);

			// Start ticking
			startTicking();

			// Enable pause button
			pauseButton.toggleAttribute("disabled", false);
		} else if (activePlayerID === player.id) {
			// If there is already an active timer, set the next player ID to active
			nextPlayer();
		}
	};
}

function nextPlayer() {
	let nextPlayerID = (activePlayerID || 0) + 1;
	if (nextPlayerID > currentPlayers.length) {
		const sorted = [...currentPlayers].sort((a, b) => a.id - b.id);
		nextPlayerID = sorted[0].id;
	}
	setActivePlayer(currentPlayers.find((p) => p.id === nextPlayerID)!);
}

function startTicking() {
	intervalID = setInterval(handleTick, tickInterval);
}

function stopTicking() {
	clearInterval(intervalID);
}

function setActivePlayer(player: Player) {
	activePlayerID = player.id;
	updateTimerUI();
}

function updateTimerUI() {
	currentPlayers.forEach((player) => {
		player.timerButtonEl.toggleAttribute(
			"data-active",
			activePlayerID === player.id
		);
		player.timeDisplayEl.innerText = formatTime(
			player.timeRemaining
		);
	});
}

function handleTick() {
	const activePlayer = currentPlayers.find(
		(p) => p.id === activePlayerID
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
					<span class="font-bold text-2xl font-mono ${
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
