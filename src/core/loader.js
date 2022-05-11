export const modules = {
	loader: {
		path: './loader.js'
	},
	pack: {
		path: '../../package.json',
		assert: { type: 'json' }
	},
	config: {
		path: './config.js'
	},
	repl: {
		path: './repl.js'
	},
	command: {
		path: './commands.js'
	}
}

export const loadAll = async () => {
	for (const moduleName in modules) {
		await load(moduleName)
	}
}

export const load = async (name) => {
	bot.logger.mark(`Loading module ${name}`)
	const module = modules[name]
	if (! module) throw `module ${name}: not found`
	else {
		bot[name] = await import(`${module.path}?date=${Date.now()}`, { assert: module.assert })
	}
}
