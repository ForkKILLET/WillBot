import { format }	from 'node:util'
import fs			from 'node:fs'
import chalk		from 'chalk'
import { showErr }	from './error.js'

const logLvs = [
	'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark'
]
const lvColors = [
	'cyanBright', 'cyanBright', 'blueBright', 'yellow', 'red', 'magenta', 'whiteBright'
]

export default class Logger {
	constructor(opt = {}) {
		this.opt = opt

		const logFns = {
			debug: 'debug',
			trace: 'trace',
			info: 'info',
			warn: 'warn',
			error: 'error',
			fatal: 'error',
			mark: 'log'
		}

		for (const [ i, lv ] of logLvs.entries()) {
			const f = (...p) => {
				const s = format(...p)
				if (opt.stdout !== false) console[logFns[lv]](s)
				if (opt.file) fs.appendFileSync(opt.file, s + '\n')
			}

			const timePrefix = () => `[${ chalk.grey((new Date).toLocaleString()) }] `
			const lvPrefix = `[${ chalk[lvColors[i]](lv.toUpperCase()) }] `

			this[lv] = (s, ...p) => {
				if (opt._lv === undefined || opt._lv <= i) f(timePrefix() + (opt.prefix ?? '') + lvPrefix + s, ...p)
			}
		}

		this.err = showErr(this.error)
	}

	get lv() {
		return logLvs[this.opt._lv]
	}

	set lv(value) {
		const i = logLvs.indexOf(value)
		this.opt._lv = i
	}
}
