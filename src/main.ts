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

setupGame({ players: 3, playerTime: 10 });

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
	timersContainer.innerHTML = /*html*/ `
		${Array.from(Array(players), (_, i) => i + 1)
			.map(
				(p) =>
					/*html*/ `<div class="flex-1 min-w-[40%] ">Player ${p}</div>`
			)
			.join("\n")}
	`;
}
