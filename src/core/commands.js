import { fileURLToPath }	from 'node:url'
import fs					from 'node:fs/promises'
import path					from 'node:path'
import chalk				from 'chalk'
import shell				from '../util/shell.js'

const suffix = '.will.js'

export const helphelp = {
	__inited: true,
	alias: [ 'help' ],
	args: [],
	fn: () => '?: alias: help\nusage: ?\nhelp: get help',
	subs: {}
}

helphelp.subs['?'] = helphelp.subs.help = helphelp

export const initCmd = (cmd, cmdName) => {
	if (cmd.__inited) return
	cmd.__inited = true

	const subs = cmd.subs ??= {}
	for (const subName in subs) {
		initCmd(subs[subName], subName)
	}
	subs['?'] ??= {
		alias: [ 'help' ],
		args: [],
		fn: () => `${cmdName}: `
			+ (cmd.alias?.length ? `alias: ${cmd.alias.join(', ')}\n` : '')
			+ `subs: ${Object.keys(subs).join(', ') || 'none'}\n`
			+ (cmd.args
				? `usage: ${cmdName} ${
					cmd.args.map(({ ty, name, opt }) => ty[0] === '$'
						? ''
						: (opt ? `[${name}: ${ty}]` : `<${name}: ${ty}>`)
					).filter(s => s).join(' ')
				}\n`
				: 'no usage\n'
			)
			+ `help: ${cmd.help ?? 'no information'}`,
		subs: {
			'?': helphelp,
			help: helphelp
		}
	}
	for (const subName in subs) {
		subs[subName].alias?.forEach(alias => {
			subs[alias] = subs[subName]
		})
	}
}

const _loadCmd = async (file) => {
	const { default: fn, name } = await import(
		path.resolve(srcPath, 'commands', file + `?date=${Date.now()}`)
	)
	const willName = name ?? file.slice(0, - suffix.length)
	try {
		bot.logger.mark(`Loading will ${chalk.cyan(willName)}...`)
		initCmd(
			bot.cmds.subs[willName] = await fn(bot),
			willName
		)
	}
	catch (err) {
		bot.logger.err(`Failed to load will ${chalk.cyan(willName)}`)(err)
	}
}

export const srcPath = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export const loadCmd = async (glob) => {
	for (const file of glob === '*'
		? (await fs.readdir(path.resolve(srcPath, 'commands')))
			.filter(file => file.endsWith(suffix))
		: Array.isArray(glob) ? glob : [ glob ]
	) await _loadCmd(file)
}

export const findCmd = (cmdName) => {
	const names = cmdName.split('.')
	let now = bot.cmds
	for (const name of names) {
		now = now.subs[name]
		if (! now) return null
	}
	return now
}

export const runCmd = async (msg) => {
	const [ tokens, flags ] = shell(msg.raw_message, {})
	const [ cmdName, ...args ] = tokens

	try {
		const cmd = findCmd(cmdName)
		if (! cmd) throw 'not found'
		if (! cmd.fn) throw 'not executable'

		const cookedArgs = cmd.args.map(rule => {
			let argErr = `arg <${rule.ty}>: `
			switch (rule.ty) {
			case '$msg':
				return msg
			case '$uid':
				return msg.sender.user_id
			case '$flags':
				return flags
			case '$tokens':
				return tokens
			case 'text':
				return args.splice(0).join(' ')
			case 'str':
			case 'num': {
				let arg = args.shift()
				if (arg === undefined && ! rule.opt) throw 'too few args'
				if (rule.ty === 'num') {
					arg = + arg
					if (isNaN(arg)) throw argErr + 'not a number'
					if (rule.int && (arg | 0) !== arg) throw argErr + 'not an integer'
				}
				return arg
			}
			default:
				throw `${rule.ty}: unknown arg type (internal error)`
			}
		})

		if (args.length) throw 'too many args'

		try {
			const reply = await cmd.fn(...cookedArgs)
			if (reply != null) await msg.reply(reply)
		}
		catch (err) {
			bot.logger.err(`Caught internal error in ${cmdName}`)(err)
			throw (err?.message ?? err) + ' (internal error)'
		}
	}
	catch (err) {
		msg.reply(`${cmdName}: ${err}`)
	}
}
