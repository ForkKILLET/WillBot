module.exports = async (wake, bot, sto, jobs) => {
	const rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: sto.prompts[0] + " "
	})

	const L = {
		msg: {
			reply: t => console.log(t),
			group_id: sto.groups[0],
			user_id: bot.uin,
			sender: {
				user_id: bot.uin,
				nickname: "WillBot::CLI"
			}
		}
	}

	jobs.reg({
		desc: "WillBot::CLI",
		sig: {
			kill: () => rl.close()
		}
	})

	rl.prompt()
	for await (const l of rl) {
		await wake(l, L)
		rl.prompt()
	}
}
