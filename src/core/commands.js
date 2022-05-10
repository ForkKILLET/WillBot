import { fileURLToPath }	from 'node:url'
import fs					from 'node:fs/promises'
import path					from 'node:path'
import shell				from '../util/shell.js'

const suffix = '.will.js'

const helphelp = {
	__inited: true,
	alias: [ 'help' ],
	args: [],
	fn: () => `?: alias: help\nusage: ?\nhelp: get help`,
	subs: {}
}

helphelp.subs['?'] = helphelp.subs.help = helphelp

const _initCmd = (cmd, cmdName) => {
	if (cmd.__inited) return
	cmd.__inited = true

	const subs = cmd.subs ??= {}
	for (const subName in subs) {
		_initCmd(subs[subName], subName)
	}
	subs['?'] ??= {
		alias: [ 'help' ],
		args: [],
		fn: () => `${cmdName}: `
			+ (cmd.alias?.length ? `alias: ${cmd.alias.join(', ')}\n` : '')
			+ `subs: ${Object.keys(subs).join(', ') || 'none'}\n`
			+ (cmd.args
				? `usage: ${cmdName} ${cmd.args.map(({ ty, name }) => ty[0] === '$' ? '' : `<${name}: ${ty}>`).filter(s => s).join(' ')}\n`
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
	const cmdName = name ?? file.slice(0, - suffix.length)
	_initCmd(bot.cmds.subs[cmdName] = await fn(bot), cmdName)
}

export const srcPath = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export const loadCmd = async (glob) => await Promise.all(
	(glob === '*'
		? (await fs.readdir(path.resolve(srcPath, 'commands')))
			.filter(file => file.endsWith(suffix))
		: Array.isArray(glob) ? glob : [ glob ]
	).map(_loadCmd)
)

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

		const cookedArgs = cmd.args.map(rule => {
			switch (rule.ty) {
			case '$msg':
				return msg
			case '$flags':
				return flags
			case '$tokens':
				return tokens
			case 'text':
				return args.splice(0).join(' ')
			case 'str':
			case 'number': {
				let arg = args.shift()
				if (arg === undefined) throw 'too few args'
				if (rule.ty === 'number') arg = + arg
				return arg
			}
			default:
				throw `${rule.ty}: unknown arg type (internal error)`
			}
		})

		if (args.length) throw 'too many args'

		try {
			const reply = await cmd.fn(...cookedArgs)
			await msg.reply(reply)
		}
		catch (err) {
			throw (err?.message ?? err) + ' (internal error)'
		}
	}
	catch (err) {
		msg.reply(`${cmdName}: ${err}`)
	}
}

bot.cmds = {
	subs: {},
	help: `Willbot v${bot.pack.version} β`
}
await loadCmd('*')
_initCmd(bot.cmds, '(root)')
