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
		callback: async () => {
			await bot.config.getConfig()
				.catch(bot.logger.err)
				.then(newCfg => bot.cfg = newCfg)
			const { file, stdout } = bot.cfg.log
			bot.logger.opt.file = file
			bot.logger.opt.stdout = stdout
			bot.logger.lv = bot.cfg.log.level
		}
	},
	mongo: {
		path: './mongo.js',
		callback: async () => {
			if (! bot.mongo.db) await bot.mongo.connect()
		}
	},
	oicqAdapter: {
		path: './oicqAdapter.js',
		callback: async () => {
			if (bot.cliArg.login && ! bot.oicq) {
				await bot.oicqAdapter.startOICQ()
			}
		}
	},
	repl: {
		path: './repl.js',
		callback: async () => {
			if (! bot.repls) {
				bot.logger.mark('Starting REPL.')
				await bot.repl.startREPL()
			}
		}
	},
	command: {
		path: './commands.js',
		callback: async (glob = '*') => {
			bot.cmds ??= {
				subs: {},
				help: `Willbot v${bot.pack.default.version} β`
			}
			if (glob !== '-') {
				await bot.command.loadCmd(glob)
				bot.command.initCmd(bot.cmds, '(root)')
			}
			bot.userEnv ??= {}
		}
	}
}

export const load = async (name, ...arg) => {
	bot.logger.info(`Loading module ${chalk.yellow(name)}...`)
	const module = modules[name]
	if (! module) throw `module ${chalk.yellow(name)}: not found`
	else {
		bot[name] = await import(`${module.path}?date=${Date.now()}`, { assert: module.assert })
		await module.callback?.(...arg)
	}
}

export const loadAll = async () => {
	for (const moduleName in modules) {
		await load(moduleName)
	}
}
