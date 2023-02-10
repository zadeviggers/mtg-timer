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

// let intervalID: ReturnType<typeof setInterval>;

type Player = {
	id: number;
	timeRemaining: number;
	timerButtonEl: HTMLButtonElement;
	timeDisplayEl: HTMLElement;
	active: boolean;
};
let currentPlayers: Player[] = [];

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
	console.log(data);
	mainMenu.close();
});

function setupGame({
	players,
	playerTime,
}: {
	players: number;
	playerTime: number;
}) {
	const playerIDs = Array.from(Array(players), (_, i) => ({
		id: i + 1,
		timeRemaining: playerTime,
	}));

	timersContainer.innerHTML = /*html*/ `
		${playerIDs
			.map(
				({ timeRemaining, id }) => /*html*/ `
				<button class="relative flex items-center justify-center flex-1 min-w-[40%] bg-slate-300 dark:bg-slate-600 data-[active]:bg-orange-500" id="player-timer-button-${id}">
					<span class="absolute top-0 left-0">Player ${id}</span>
					<span class="" id="player-time-display-${id}">${formatTime(
					timeRemaining
				)}</span>
				</button>
				`
			)
			.join("\n")}
	`;

	currentPlayers = playerIDs.map(({ id, timeRemaining }) => ({
		id,
		timeRemaining,
		timerButtonEl: document.getElementById(
			`player-timer-button-${id}`
		) as HTMLButtonElement,
		timeDisplayEl: document.getElementById(
			`player-time-display-${id}`
		) as HTMLElement,
		active: false,
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
		// Get active players
		const activePlayers = currentPlayers.filter((p) => p.active);

		// Check if there there are no active players
		if (activePlayers.length === 0) {
			// There isn't an active timer right now,
			// so make this player the active player.
			setActivePlayer(player);
		} else if (activePlayers.find((p) => p.id === player.id)) {
			// If there is already an active timer
			let nextPlayerID = activePlayers[0].id + 1;
			if (nextPlayerID > currentPlayers.length)
				nextPlayerID = 1;
			setActivePlayer(
				currentPlayers.find(
					(p) => (p.id = nextPlayerID)
				)!
			);
		}
	};
}

function setActivePlayer(player: Player) {
	console.log(`Setting current player to ${player.id}`);
	const currentPlayersWithoutThisPlayer = currentPlayers.filter(
		(p) => p.id !== player.id
	);
	currentPlayers = [
		...currentPlayersWithoutThisPlayer.map((p) => ({
			...p,
			active: false,
		})),
		{ ...player, active: true },
	];
	updateTimerUI();
}

function updateTimerUI() {
	currentPlayers.forEach((player) => {
		player.timerButtonEl.toggleAttribute(
			"data-active",
			player.active
		);
		player.timeDisplayEl.innerText = formatTime(
			player.timeRemaining
		);
	});
}

function formatTime(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	const seconds = (ms % 60000) / 1000;
	return `${minutes < 10 ? "0" : ""}${minutes}:${
		seconds < 10 ? "0" : ""
	}${seconds.toFixed(0)}`;
}
