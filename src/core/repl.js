import repl			from 'node:repl'
import cp			from 'node:child_process'
import path			from 'node:path'
import fs			from 'node:fs'
import { mkfifo }	from 'mkfifo'

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

	const replServer = repl.start({
		input, output,
		useGlobal: true, useColors: true,
		prompt: bot.cfg.repl.prompt ?? 'w>'
	})

	replServer.on('exit', () => {
		bot.logger.mark('Interrupted by user.')
		process.exit(0)
	})

	replServer.defineCommand('reload', async (name) => {
		try {
			if (name === '*') await bot.loader.loadAll()
			else await bot.loader.load(name)
		}
		catch (err) {
			bot.logger.fatal(`Failed to reload module ${name}: %o`, err)
		}
		bot.repls.displayPrompt()
	})

	return replServer
}
