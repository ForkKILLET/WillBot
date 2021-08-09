// :: Import

const fs				= require("fs").promises
const minimist			= require("minimist")
const { createClient }	= require("oicq")
let will				= require("./will")

// :: Util

const arg = minimist(process.argv.slice(2), {
	"--": true,
	alias: {
		config: "c",
		uin: "u",
		password: "p",
		platform: "f"
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

	bot.on("system.offline", () => {
		bot.logger.mark("WillBot: The new will is sleeping.")
		bot.login(pw)
	})

	bot.on("message", msg => {
		try {
			if (sto.groups.includes(msg.group_id) || msg.message_type === "private") {
				bot.logger.info(msg)
				const raw = msg.raw_message.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))

				const pr = sto.prompt.find(s => raw.startsWith(s))
				if (pr) {
					const l = { msg }
					if (! will.l) {
						will.l = true
						l.sto = sto
						l.bot = bot
						l.reload = () => {
							delete require.cache[ Object.keys(require.cache).find(fp => fp.endsWith("will.js")) ]
							will = require("./will")
						}
					}
					will(raw.slice(pr.length).trim(), l)
				}
			}
		}
		catch (err) {
			bot.logger.error(err)
		}
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
} ()
