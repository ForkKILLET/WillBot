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
					cmd.args.map(({ ty, name, opt, named }) => {
						if (ty[0] === '$')	return ''
						if (named)			return `--${name}: ${ty}`
						if (opt)			return `[${name}: ${ty}]`
						if (named)			return `<${name}: ${ty}>`
					}).filter(s => s).join(' ')
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

export class CmdError extends Error {
	constructor(msg, doLog) {
		super(msg)
		if (doLog) bot.logger.err('Handled internal error')(msg)
	}
}

export const runCmd = async (msg) => {
	let raw = msg.raw_message.trimStart() || '?'
	const uid = msg.sender.user_id
	bot.logger.info('Running by %d: %s', uid, raw)

	msg.reply.err = err => {
		msg.reply((bot.cfg.commands['error-prefix'] ?? '') + err)
	}

	const env = bot.userEnv[uid] ??= (await bot.mongo.db
		.collection('my_env')
		.findOne({ _id: uid }))
		?.env ?? {}

	const [ tokens, flags ] = shell(raw, env)
	const { _: [ cmdName, ...args ], ...named } = minimist(tokens)

	if (flags.dq) return msg.reply.err('unmatched "')
	if (flags.sq) return msg.reply.err('unmatched \'')

	const [ head, ...tail ] = cmdName.split('.')
	const alias = await bot.mongo.db.collection('my_alias').findOne({ uid, alias: head })
	const cookedCmdName = [ alias ? alias.command : head, ...tail ].join('.')

	try {
		let cmd = findCmd(cookedCmdName)
		if (! cmd) {
			const withCmds = (await bot.mongo.db
				.collection('my_with')
				.findOne({ _id: uid }))
				?.commands
			if (withCmds) for (const c of withCmds) {
				if (cmd = findCmd(c + '.' + cookedCmdName)) break
			}
			if (! cmd) throw 'not found'
		}
		if (! cmd.fn) throw 'not executable'

		const cookedArgs = cmd.args.map((rule) => {
			const argErr = `arg (${rule.name}: ${rule.ty}): `
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
					if (arg && rule.named === false) throw `${rule.name}: forbidden named arg`
					delete named[rule.name]
				}
				else {
					if (rule.named) return
					arg = args.shift()
					if (arg === undefined) {
						if (! rule.opt) throw 'too few args'
						return
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
					else throw argErr + 'not a boolean (true or false)'
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
			if (typeof reply === 'string') msg.reply(reply)
			else if (reply instanceof CmdError) msg.reply.err(reply.message)
			else throw 'Reply is not a string'
		}
		catch (err) {
			bot.logger.err(`Caught internal error in ${cookedCmdName}`)(err)
			throw (err?.message ?? err) + ' (internal error)'
		}
	}
	catch (err) {
		msg.reply.err(`${cookedCmdName}: ${err}`)
	}
}
