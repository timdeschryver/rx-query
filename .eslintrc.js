module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	env: {
		browser: true,
		node: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"prettier/@typescript-eslint",
		"plugin:jest/recommended",
	],
	rules: {
		"@typescript-eslint/no-unused-vars": ["off", { argsIgnorePattern: "^_" }],
		"no-mixed-spaces-and-tabs": "off",
		"no-case-declarations": "off",
	},
};
