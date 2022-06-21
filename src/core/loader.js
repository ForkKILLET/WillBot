import path		from 'node:path'
import chalk	from 'chalk'

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
			bot.cfg = await bot.config.getConfig()
				.catch(bot.logger.err('Illegal config', 1))
			if (! bot.cfg) throw Error(`Config file doesn't exist at ${
				path.resolve(bot.cliArg['rc-path'], 'config.yml')
			}`)
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
	fastify: {
		path: './fastify.js',
		callback: () => {
			bot.fastify.clean()
		}
	},
	oicqAdapter: {
		path: './oicqAdapter.js',
		callback: async () => {
			if (bot.cliArg.login && ! bot.oicq) {
				await bot.oicqAdapter.start()
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
			bot.fastify.clean()

			bot.cmds ??= {
				subs: {},
				get help() {
					return `Willbot v${bot.pack.default.version} β`
				}
			}
			if (glob !== '-') {
				await bot.command.loadCmd(glob)
				bot.command.initCmd(bot.cmds, '(root)')
			}
			bot.userEnv ??= {}

			await bot.fastify.start()
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
