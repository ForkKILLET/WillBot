import chalk		from 'chalk'
import { showErr }	from './error.js'

let _lv = 1
const logLvs = [ 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'mark' ]
const lvColors = [ 'cyanBright', 'cyanBright', 'blueBright', 'yellow', 'red', 'magenta', 'whiteBright' ]

export default class Logger {
	constructor(opt = {}) {
		const logFns = {
			debug: 'debug',
			info: 'info',
			warn: 'warn',
			error: 'error',
			fatal: 'error',
			mark: 'log',
		}

		for (const [ i, lv ] of logLvs.entries()) {
			const f = console[logFns[lv]]
			const lvPrefix = `[${ chalk[lvColors[i]](lv.toUpperCase()) }] `

			this[lv] = (s, ...p) => {
				if (_lv <= i) f((opt.prefix ?? '') + lvPrefix + s, ...p)
			}
		}

		this.err = showErr(this.error)
	}

	static get lv() {
		return logLvs[_lv]
	}
	static set lv(value) {
		const i = logLvs.indexOf(value)
		_lv = i
	}
}
