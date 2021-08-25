module.exports = (_, fun) => ({
	list: async () => {1, "l", "*" // Show all projects.
		return (await fun.test.zsh(String.raw`
			grep -Pzo '# ::::\tSRC BEGIN(.|\n)+# ::::\tSRC END' ~/.zshrc
		`
			.trim()))
			.replace(/d=/g, "")
			.replace(/ +;.*/gm, "")
	},
	last: src => {1 // Show the last git commit message of a project at [src].
		if (! src.match(/^[a-z]+$/)) return "Project: Rejected for non-letter [src]"
		return fun.test.$z(`cdsrc ${src}; git log --format=%B -n 1`)
	}
})
