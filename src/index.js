// :: Import

const fs				= require("fs").promises
const minimist			= require("minimist")
const { createClient }	= require("oicq")
const htmlEntities		= require("html-entities")
side_effect				: require("./util")
let will				= require("./will")
const cli				= require("./cli")

// :: Util

const arg = minimist(process.argv.slice(2), {
	"--": true,
	alias: {
		config: "c",
		uin: "u",
		password: "p",
		platform: "f",
		cli: "i",
		safesleep: "s"
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

const jobs = []

jobs.reg = job => {
	const id = jobs.length
	jobs.push({
		...job,
		id,
		time: Date.now()
	})
	return {
		id,
		job: jobs[id],
		rmv: () => jobs.splice(id, 1)
	}
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
		await Date.sleep(10000)
		bot.login(pw)
	})

	process.on("SIGINT", async () => {
		await sto.write()
		if (arg.safesleep && sto?.log.cmds?.[0].match(/^(?!\s*(op\.)?sleep(?! +WillBot::SafeSleep))/)) {
			await wake("op.sleep WillBot::SafeSleep", {
				msg: {
					user_id: bot.uin,
					reply: t => console.log(t)
				}
			})
			process.exit(0)
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

	// :::: Wake

	const wake = async (raw, L) => {
		if (! will.l) {
			will.l = true
			L.sto = sto
			L.bot = bot
			L.jobs = jobs
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

	if (arg.cli) cli(wake, bot, sto, jobs)

	bot.on("message", msg => {
		try {
			if (sto.groups.includes(msg.group_id) || msg.message_type === "private") {
				bot.logger.info(msg)
				const raw = htmlEntities.decode(msg.raw_message)
				const prompt = sto.prompts.find(s => raw.startsWith(s.split(":")[0]))

				if (prompt) {
					const [ str, cmd ] = prompt.split(":")
					wake((cmd ?? "") + raw.slice(str.length).trimStart(), {
						wake, msg
					})
				}
			}
		}
		catch (err) {
			bot.logger.error(err)
		}
	})
} ()
