#!/bin/env node

import path				from 'node:path'
import minimist			from 'minimist'
import { createClient }	from 'oicq'
import { MongoClient }	from 'mongodb'
import chalkT			from 'chalk-template'
import Logger			from './util/logger.js'
import { loadAll }		from './core/loader.js'

const startBot = async (logger) => {
	global.bot = { logger }

	bot.cliArg = minimist(process.argv.slice(2), {
		alias: {
			'rc-path': 'c'
		},
		default: {
			'rc-path': path.resolve(process.env.HOME, '.config/WillbotBeta'),
			'login': true
		},
		boolean: [ 'login' ]
	})

	await loadAll()

	logger.opt.logFile = bot.cfg.log.file
	Logger.lv = bot.cfg.log.level ?? 'warn'

	const { addr, port, name } = bot.cfg.database
	const uri = encodeURI(`mongodb://${addr}:${port}`)
	logger.mark(`Connecting MongoDb at ${uri}.`)

	bot.mongo = {
		client: new MongoClient(uri, { connectTimeoutMS: 5 * 1000 })
	}
	await bot.mongo.client.connect()
	bot.mongo.db = bot.mongo.client.db(name ?? 'willbot')
	logger.mark('Connected.')

	const { uin, pw } = bot.cfg.account

	if (bot.cliArg.login) {
		logger.mark(`Logging into ${uin} with OICQ client.`)

		const oicq = createClient(uin, {
			log_level: 'off',
			data_dir: path.resolve(bot.cliArg['rc-path'], 'oicq-data')
		})
		bot.oicq = oicq
		oicq.logger = new Logger({
			prefix: chalkT`[{yellow OICQ}] `,
			logFile: bot.cfg.log.file
		})
		await oicq.login(pw)

		await new Promise(res => bot.oicq.on('system.online', res))
		logger.mark('Logged in.')

		oicq.on('message', async (msg) => {
			const prompt = bot.cfg.commands.prompts.find(s => msg.raw_message.startsWith(s))
			if (prompt) {
				msg.raw_message = msg.raw_message.slice(prompt.length)
				await bot.command.runCmd(msg)
			}
		})
	}

	logger.mark('Starting REPL.')
	bot.repls = await bot.repl.startREPL()

	return bot
}

const main = async () => {
	const logger = new Logger({
		prefix: chalkT`[{cyanBright WB-β}] `
	})
	await startBot(logger).catch(logger.err('Failed to start bot:', 1))

	process.on('exit', (code) => {
		bot.logger.mark(`Exit with status code ${code}`)
	})
}

main()
