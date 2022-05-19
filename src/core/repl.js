import repl				from 'node:repl'
import cp				from 'node:child_process'
import path				from 'node:path'
import fs				from 'node:fs'
import { mkfifo }		from 'mkfifo'
import shell			from '../util/shell.js'

export const startREPL = async () => {
	let input, output

	const { on, command, args } = bot.cfg.repl['new-session']
	if (on) {
		const date = Date.now()
		const pipePath = path.resolve(bot.cliArg['rc-path'], `repl-io-${date}.pipe`)

		await new Promise((res, rej) => mkfifo(pipePath, 0o755, (err) => {
			if (err) rej(err)
			else res()
		}))

		const vars = { 'io_pipe': pipePath }
		cp.spawn(command, args.map(arg => arg.replace(/{{(.*)}}/g, (_, k) => vars[k] ?? '')))

		const ioPath = (await fs.promises.readFile(pipePath, { encoding: 'utf-8' })).trim()

		await fs.promises.rm(pipePath)

		input = fs.createReadStream(ioPath)
		output = fs.createWriteStream(ioPath)
	}
	else {
		input = process.stdin
		output = process.stdout
	}

	const modes = {
		eval: {
			prompt: bot.cfg.repl.prompt.eval ?? 'eval> '
		},
		command: {
			prompt: bot.cfg.repl.prompt.command ?? 'will> ',
			eval: (raw, _context, _filename, cb) => (
				new Promise(resolve => {
					const fakeMsg = {
						sender: {
							user_id: 0
						},
						raw_message: raw.replace(/\r?\n$/, ''),
						reply: s => resolve(s)
					}
					bot.command.runCmd(fakeMsg)
				})
					.then(res => cb(null, res))
					.catch(err => cb(err, null))
			),
			writer: s => s,
			completer: async (raw, cb) => {
				const [ tokens ] = shell(raw)
				if (tokens.length > 1) return cb(null, [ [], raw ])
				const names = tokens[0].split('.')
				const ancestors = names.slice(0, -1).join('.')
				const now = names.at(-1)

				const cmd = await bot.command.findCmdWith(ancestors, 0)
				if (! cmd?.subs) return cb(null, [ [], raw ])

				const subNames = Object.keys(cmd.subs)
				const ancestorsPrefix = ancestors ? ancestors + '.' : ''
				cb(null, [
					(now
						? subNames.filter(s => s.startsWith(now))
						: subNames
					)
						.map(s => ancestorsPrefix + s),
					raw
				])
			}
		}
	}

	const server = repl.start({
		input, output,
		useGlobal: true, useColors: true,
		preview: false, // Note: For compatibility with command mode. :(
		prompt: modes.eval.prompt
	})

	modes.eval.eval = server.eval
	modes.eval.writer = server.writer
	modes.eval.completer = server.completer

	server.on('exit', () => {
		bot.logger.mark('Interrupted by user.')
		process.exit(0)
	})

	server.defineCommand('reload', {
		help: 'Reload a module defined in <src/core/loader.js>',
		action: async (name) => {
			try {
				if (name === '*') await bot.loader.loadAll()
				else await bot.loader.load(name)
			}
			catch (err) {
				bot.logger.fatal(`Failed to reload module ${name}: %o`, err)
			}
			server.displayPrompt()
		}
	})

	const defineMode = name => {
		const mode = modes[name]
		server.defineCommand(name, {
			help: `Enter ${name} mode`,
			action: () => {
				server.eval = mode.eval
				server.writer = mode.writer
				server.completer = mode.completer
				server.setPrompt(mode.prompt)
				server.displayPrompt()
			}
		})
	}

	defineMode('eval')
	defineMode('command')

	delete server.commands.break

	return server
}
