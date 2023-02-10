import "./style.css";

const openMenuButton = document.getElementById(
	"menu-button"
) as HTMLButtonElement;
const mainMenu = document.getElementById("main-menu") as HTMLDialogElement;
const closeMenuButton = document.getElementById(
	"close-button"
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

// This layouts system means I can set it up so that the order of play goes around
// rather than side to side and down.
const layouts: Record<number, (timeInMS: number) => string> = {
	2: (ms) => renderLayout(arrayOfLength(2), ms),
	3: (ms) => renderLayout(arrayOfLength(3), ms),
	4: (ms) => renderLayout([1, 2, 4, 3], ms),
	5: (ms) => renderLayout([1, 2, 5, 3, 4], ms),
	6: (ms) => renderLayout([1, 2, 6, 3, 5, 4], ms),
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
			Number.parseInt(data.get("turn-time")! as string) *
			60 *
			1000,
	});
	mainMenu.close();
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
		// Check if there there are no active players
		if (!activePlayerID) {
			// There isn't an active timer right now,
			// so make this player the active player.
			setActivePlayer(player);

			intervalID = setInterval(handleTick, tickInterval);
		} else if (activePlayerID === player.id) {
			// If there is already an active timer, set the next player ID to active
			let nextPlayerID = activePlayerID + 1;
			if (nextPlayerID > currentPlayers.length) {
				nextPlayerID = 1;
			}
			setActivePlayer(
				currentPlayers.find(
					(p) => p.id === nextPlayerID
				)!
			);
		}
	};
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

	if (date.getUTCMinutes() < 1)
		formattedTimes.push(zeroPadded(date.getUTCMilliseconds(), 3));

	return formattedTimes.join(":");
}

function renderLayout(players: number[], timeInMS: number): string {
	return /*html*/ `
		${players
			.map(
				(id) => /*html*/ `
				<button class="relative flex items-center justify-center flex-1 min-w-[40%] bg-slate-300 dark:bg-slate-600 data-[active]:bg-orange-500" id="player-timer-button-${id}">
					${
						import.meta.env.DEV
							? /*html*/ `
							<span class="absolute top-0 left-0">
								Player ${id}
							</span>`
							: ""
					}
					<span class="" id="player-time-display-${id}">${formatTime(timeInMS)}</span>
				</button>
				`
			)
			.join("\n")}
	`;
}
function arrayOfLength(length: number) {
	return Array.from(Array(length), (_, i) => i + 1);
}
