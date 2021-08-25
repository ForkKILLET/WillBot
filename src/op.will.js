module.exports = (L, fun) => ({
	echo: {
		_: t => {1 // Say [t]ext.
			if (L.sto.prompt.some(s => t.startsWith(s))) fun.access.req(
				L.sto.access?.[ L.bot.uin ] ?? 0,
				"Needed lv >= the bot when the words to echo starts with a prompt"
			)
			L.msg.reply(t, true)
		},
		raw: t => {3 // Say [t]ext. CQ Code is allowed.
			if (L.sto.prompt.some(s => t.startsWith(s))) fun.access.req(
				L.sto.access?.[ L.bot.uin ] ?? 0,
				"Needed lv >= the bot when the words to echo starts with a prompt"
			)
			return t
		}
	},
	at: ([ uid ] = [ "=u" ]) => {1
		return `[CQ:at,qq=${uid}]`
	},
	sleep: async y => {4 // Let the bot go to bed.
		await L.msg.reply("Op: Good night to all free and unbreakable wills. "
			+ (y ? "\n" + y : ""))

		const l = L.jobs.length
		let i = 0
		L.jobs.forEach(job => {
			if (job.sig?.kill) {
				job.sig.kill()
				i ++
			}
		})
		await L.msg.reply(`Jobs: Cleared ${i} of ${l} jobs.`)

		await L.sto.write()
		await L.bot.logout()
	},
	card: ([ uid, card ] = [ "u", "=s" ]) => {4 // Set group card.
		L.bot.setGroupCard(L.msg.group_id, uid ?? L.bot.uin, card)
		return `Op: Whatever ${ uid ? "one" : "I" } name, ${ uid ? "wish his" : "my" } will won't change.`
	},
	like: ([ id, times ] = [ "=u", "u" ]) => {3 // Send 10 likes to specific [id] or yourself.
		id ||= L.msg.user_id
		L.bot.sendLike(id, times ?? 10)
		return "Op: Greet the one favored by the Upper Will."
	},
	gag: ([ uid, duration ] = [ "u", "=u" ]) => {3 // Gag [uid] or yourself for [duration] seconds.
		L.bot.setGroupBan(L.msg.group_id, uid ?? L.msg.user_id, duration ?? 60)
		return "Op: Silence is good sacrifice to the Upper Will."
	}
})
