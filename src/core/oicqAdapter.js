import path				from 'node:path'
import { createClient }	from 'oicq'
import chalkT			from 'chalk-template'
import Logger			from '../util/logger.js'

export const start = async () => {
	const { account: { uin, pw, platform }, log: { oicqLevel } } = bot.cfg

	if (bot.cliArg.login) {
		bot.logger.mark(chalkT `Logging into {blueBright ${uin}} with OICQ client.`)

		const oicq = createClient(uin, {
			log_level: 'off',
			data_dir: path.resolve(bot.cliArg['rc-path'], 'oicq-data'),
			platform
		})
		bot.oicq = oicq
		oicq.logger = new Logger({ ...bot.logger.opt })
		oicq.logger.lv = oicqLevel
		oicq.logger.opt.prefix = chalkT `[{yellow OICQ}] `

		oicq
			.on('system.login.slider', () => {
				oicq.logger.mark('Input ticket: ')
				process.stdin.once('data', ticket => oicq.submitSlider(String(ticket).trim()))
			})
			.on('system.login.qrcode', () => {
				oicq.logger.mark('Enter to login with QR code: ')
				process.stdin.once('data', () => oicq.login())
			})
			.login(pw)

		await new Promise(res => bot.oicq.on('system.online', res))
		bot.logger.mark('Logged in.')

		oicq.on('message', async (msg) => {
			msg.raw_message = msg.raw_message.trimStart()
			const prompt = bot.cfg.commands.prompts.find(s => msg.raw_message.startsWith(s))
			if (prompt) {
				msg.raw_message = msg.raw_message.slice(prompt.length)
				await bot.command.runCmd(msg)
			}
		})
	}
}
