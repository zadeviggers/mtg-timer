import "./style.css";

const openMenuButton = document.getElementById(
	"menu-button"
) as HTMLButtonElement;
const mainMenu = document.getElementById("main-menu") as HTMLDialogElement;
const closeMenuButton = document.getElementById(
	"close-button"
) as HTMLButtonElement;
const optionsForm = document.getElementById("game-settings") as HTMLFormElement;

openMenuButton.addEventListener("click", () => {
	mainMenu.showModal();
});

closeMenuButton.addEventListener("click", () => {
	mainMenu.close();
});

optionsForm.addEventListener("submit", (ev) => {
	ev.preventDefault();
	const data = new FormData(optionsForm);
	console.log(data);
	mainMenu.close();
});
