/** @type {import('prettier').Config} */

module.exports = {
	plugins: [require("prettier-plugin-tailwindcss")],
	trailingComma: "es5",
	tabWidth: 8,
	semi: true,
	singleQuote: false,
	useTabs: true,
	bracketSameLine: true,
}
