// :: Import

const fs				= require("fs").promises
const minimist			= require("minimist")
const { createClient }	= require("oicq")
let will				= require("./will")

// :: Util

Date.sleep = t => new Promise(res => setTimeout(res, t))

const arg = minimist(process.argv.slice(2), {
	"--": true,
	alias: {
		config: "c",
		uin: "u",
		password: "p",
		platform: "f",
		cli: "i"
	}
})

let pw = arg.password

const sto = {
	read: async () =>
		Object.assign(sto, JSON.parse(await fs.readFile("/home/.config/willbot.json"))),
	write: async () =>
		await fs.writeFile(
			arg.config ?? `${process.env.HOME}/.config/willbot.json`,
			new Uint8Array(Buffer.from(JSON.stringify(sto, null, 4)))
		)
}

// :: Init

void async function init() {
	await sto.read()

	const bot = createClient(arg.uin ?? sto.uin, {
		platform: arg.platform ?? 5,
		log_level: "warn"
	})

	bot.on("system.online", () => {
		bot.logger.mark("WillBot: A new will is awakening.")
	})

	bot.on("system.offline", async () => {
		bot.logger.mark("WillBot: The new will is sleeping.")
		await Date.sleep(5000)
		bot.login(pw)
	})

	bot.on("system.login.slider", () => {
		bot.logger.mark("Willbot: Request ticket:")
		process.stdin.once("data", input =>
			bot.sliderLogin(input)
		)
	})

	bot.on("system.login.device", () => {
		process.stdin.once("data", () => {
			bot.login()
		})
	})

	bot.on("request.friend.add", data => {
		bot.logger.mark(data) // TODO
	})

	bot.logger.mark("Willbot: Request password:")

	if (pw) bot.login(pw)
	else process.stdin.once("data", input =>
		bot.login(pw = input.toString().slice(0, -1))
	)

	// :::: Wake

	const wake = async (raw, L) => {
		if (! will.l) {
			will.l = true
			L.sto = sto
			L.bot = bot
			L.reload = () => {
				Object.keys(require.cache)
					.filter(fp => fp.endsWith("will.js"))
					.reverse()
					.forEach(fp => delete require.cache[fp])
				will = require("./will")
			}
		}
		await will(raw, L)
	}

	let cli_rl
	if (arg.cli) bot.on("system.online", () => {
		cli_rl = require("./cli")(wake, bot, sto)
	})

	bot.on("message", msg => {
		try {
			if (sto.groups.includes(msg.group_id) || msg.message_type === "private") {
				bot.logger.info(msg)
				const raw = msg.raw_message.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
				const pr = sto.prompt.find(s => raw.startsWith(s))

				if (pr) wake(raw.slice(pr.length).trim(), {
					msg,
					sleep: async () => {
						await sto.write()
						bot.logout()
						cli_rl?.close?.()
					}
				})
			}
		}
		catch (err) {
			bot.logger.error(err)
		}
	})
} ()
