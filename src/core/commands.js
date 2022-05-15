import { fileURLToPath }	from 'node:url'
import fs					from 'node:fs/promises'
import path					from 'node:path'
import chalk				from 'chalk'
import minimist				from 'minimist'
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

	const parseStrArg = ([ name, ty, ...rest ]) => ({
		ty, name,
		...Object.fromEntries(rest.map(k => [ k, true ]))
	})
	cmd.args = cmd.args?.map(arg => typeof arg === 'string'
		? parseStrArg(arg.split(':'))
		: arg)

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
		bot.logger.info(`Loading will ${chalk.cyan(willName)}...`)
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
	let raw = msg.raw_message.trimStart() || '?'
	const uid = msg.sender.user_id
	bot.logger.info('Running by %d: %s', uid, raw)

	const custom = await bot.mongo.db
		.collection('custom')
		.findOne({ _id: uid })
	if (custom?.alias) {
		raw = raw.replace(/^[\w-]+(?=\s|$|\.)/, firstWord => {
			return custom.alias[firstWord] ?? firstWord
		})
	}

	const [ tokens, flags ] = shell(raw, {})
	const { _: [ cmdName, ...args ], ...named } = minimist(tokens)

	try {
		const cmd = findCmd(cmdName)
		if (! cmd) throw 'not found'
		if (! cmd.fn) throw 'not executable'

		const cookedArgs = cmd.args.map(rule => {
			let argErr = `arg <${rule.name}: ${rule.ty}>: `
			switch (rule.ty) {
			case '$msg':
				return msg
			case '$uid':
				return uid
			case '$flags':
				return flags
			case '$tokens':
				return tokens
			case '$self':
				return cmd
			case 'text':
				return args.splice(0).join(' ')
			case 'str':
			case 'bool':
			case 'num': {
				let arg
				if (rule.name in named) {
					arg = named[rule.name]
					delete named[rule.name]
				}
				else {
					arg = args.shift()
					if (arg === undefined) {
						if (! rule.opt) throw 'too few args'
						return undefined
					}
				}
				if (rule.ty === 'num') {
					arg = Number(arg)
					if (isNaN(arg)) throw argErr + 'not a number'
					if (rule.int && (arg | 0) !== arg) throw argErr + 'not an integer'
				}
				if (rule.ty === 'bool') {
					if (`${arg}` === 'true') arg = true
					else if (`${arg}` === 'false') arg = false
					else throw 'not a boolean (true or false)'
				}
				if (rule.ty === 'str') {
					arg = String(arg)
				}
				return arg
			}
			default:
				throw `${rule.ty}: unknown arg type (internal error)`
			}
		})

		const rest = Object.keys(named)
		if (rest.length) throw rest.join(', ') + ': unknown named arg'

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
