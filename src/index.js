#!/bin/env node

import path				from 'node:path'
import './util/silent-experimental-warning.js'
import minimist			from 'minimist'
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
			login: true
		},
		boolean: [ 'login' ]
	})

	await loadAll()
}

const main = async () => {
	const logger = new Logger({
		prefix: chalkT `[{cyanBright WB-β}] `
	})
	await startBot(logger).catch(logger.err('Failed to start bot:', 1))

	process
		.on('exit',
			(code) => bot.logger.mark(`Exit with status code ${code}`)
		)
		.on('unhandledRejection',
			(err, promise) => bot.logger.fatal('Uncaught rejection %o at promise %o', err, promise)
		)
		.on('uncaughtException',
			(err) => bot.logger.fatal('Uncaught exception %o', err)
		)
}

main()
