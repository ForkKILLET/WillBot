export const modules = {
	loader: {
		path: './loader'
	},
	config: {
		path: './config'
	},
	repl: {
		path: './repl'
	},
	command: {
		path: './commands'
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
		bot[name] = await import(`${module.path}.js?date=${Date.now()}`)
	}
}
