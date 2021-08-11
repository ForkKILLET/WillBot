module.exports = async (wake, bot, sto) => {
	const rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: sto.prompt[0] + " "
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
		},
		sleep: async () => {
			await sto.write()
			bot.logout()
			rl.close()
		}
	}

	rl.prompt()
	read: for await (const l of rl) {
		await wake(l, L)
		rl.prompt()
	}
}
