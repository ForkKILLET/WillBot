import repl				from 'node:repl'
import cp				from 'node:child_process'
import path				from 'node:path'
import fs				from 'node:fs'
import shell			from '../util/shell.js'

export let server

export const startREPL = async () => {
	let input, output

	const { on, command, args } = bot.cfg.repl['new-session']
	if (on) {
		const { mkfifo } = await import('mkfifo')

		const date = Date.now()
		const pipePath = path.resolve(bot.cliArg['rc-path'], `repl-io-${date}.pipe`)

		await new Promise((res, rej) => mkfifo(pipePath, 0o755, (err) => {
			if (err) rej(err)
			else res()
		}))

		const vars = { io_pipe: pipePath }
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
				if (tokens.length > 1) return cb(null, [[], raw ])
				const names = tokens[0].split('.')
				const ancestors = names.slice(0, - 1).join('.')
				const now = names.at(- 1)

				const cmd = await bot.command.findCmdWith(ancestors, 0)
				if (! cmd?.subs) return cb(null, [[], raw ])

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

	const s = repl.start({
		input, output,
		useGlobal: true, useColors: true,
		preview: false, // Note: For compatibility with command mode. :(
		prompt: modes.eval.prompt
	})

	modes.eval.eval = s.eval
	modes.eval.writer = s.writer
	modes.eval.completer = s.completer

	s.on('exit', () => {
		bot.logger.mark('Interrupted by user.')
		process.exit(0)
	})

	s.defineCommand('reload', {
		help: 'Reload a module defined in <src/core/loader.js>',
		action: async (ln) => {
			const [ name, ...arg ] = ln.split(/ +/g)
			try {
				await bot.loader.load(name, ...arg)
			}
			catch (err) {
				bot.logger.fatal(`Failed to reload module ${name}: %o`, err)
			}
			s.displayPrompt()
		}
	})

	const defineMode = name => {
		const mode = modes[name]
		s.defineCommand(name, {
			help: `Enter ${name} mode`,
			action: () => {
				s.eval = mode.eval
				s.writer = mode.writer
				s.completer = mode.completer
				s.setPrompt(mode.prompt)
				s.displayPrompt()
			}
		})
	}

	defineMode('eval')
	defineMode('command')

	delete s.commands.break

	server = s
}
