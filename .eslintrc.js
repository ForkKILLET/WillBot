module.exports = {
	env: {
		node: true,
	},
	parserOptions: {
		ecmaVersion: 12
	},
	rules: {
		"indent": [ 0, "tab" ],
		"object-property-newline": 0,
		"no-multiple-empty-lines": [ 2, { max: 2, maxEOF: 1, maxBOF: 0 } ],

		"no-multi-spaces": 0,
		"no-trailing-spaces": 2,
		"key-spacing": 0,
		"space-before-function-paren": 0,
		"space-unary-ops": [ 2, { words: true, nonwords: true } ],

		"camelcase": 0,
		"spaced-comment": 2,
		"semi": [ 2, "never" ],
		"quotes": [ 2, "double", { allowTemplateLiterals: true } ],
		"quote-props": [ 2, "as-needed" ],
		"comma-dangle": 0,
		"no-sequences": 0,

		"no-var": 2,
		"one-var": 0,
		"no-unused-vars": [ 2, { varsIgnorePattern: "^_" } ],
		"no-undef": 2,

		"no-case-declarations": 0,
		"no-fallthrough": 0,

		"array-bracket-spacing": 0,
		"template-curly-spacing": 0,
		"computed-property-spacing": [ 0, "always" ],
		"curly": 0,
		"brace-style": [ 0, "stroustrup", { allowSingleLine: true } ],

		"eqeqeq": [ 2, "always", { null: "ignore" } ],
		"no-mixed-operators": 0,
		"space-unary-ops": 0,
		"operator-linebreak": 0,

		"no-extend-native": 0,
	},
	globals: [
		"marked",
		"filterXSS",
		"scrollToId",
		"type_dat", "proxy_dat", "load_dat", "save_dat", "clear_dat", "raw_dat"
	].reduce((o, k) => (o[k] = true, o), {})
}

