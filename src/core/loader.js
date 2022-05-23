import chalk from 'chalk'

export const modules = {
	loader: {
		path: './loader.js'
	},
	pack: {
		path: '../../package.json',
		assert: { type: 'json' }
	},
	config: {
		path: './config.js',
		callback: async () => await bot.config.getConfig(bot)
			.catch(bot.logger.err)
			.then(newCfg => bot.cfg = newCfg)
	},
	mongo: {
		path: './mongo.js',
		callback: async () => {
			if (! bot.mongo.db) await bot.mongo.connect()
		}
	},
	repl: {
		path: './repl.js',
		callback: async () => {
			if (bot.repls) {
				bot.repls.restart = true
				await bot.repl.server.close()
				bot.logger.mark('Restarting REPL.')
				await bot.repl.startREPL()
			}
		}
	},
	command: {
		path: './commands.js',
		callback: async () => {
			bot.cmds = {
				subs: {},
				help: `Willbot v${bot.pack.default.version} β`
			}
			await bot.command.loadCmd('*')
			bot.command.initCmd(bot.cmds, '(root)')
			bot.userEnv = {}
		}
	}
}

export const loadAll = async () => {
	for (const moduleName in modules) {
		await load(moduleName)
	}
}

export const load = async (name) => {
	bot.logger.info(`Loading module ${chalk.yellow(name)}...`)
	const module = modules[name]
	if (! module) throw `module ${chalk.yellow(name)}: not found`
	else {
		bot[name] = await import(`${module.path}?date=${Date.now()}`, { assert: module.assert })
		await module.callback?.()
	}
}
