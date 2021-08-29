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
		} },
	at: ([ uid ] = [ "=U" ]) => {1 // Just at someone.
		return `[CQ:at,qq=${uid}]`
	},
	sleep: async y => {4, "shutdown" // Let the bot go to bed.
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
	card: ([ uid, card ] = [ "U", "!=s" ]) => {4 // Set group card.
		uid ??= L.bot.uin
		if (uid !== L.msg.user_id) fun.access.req(
			Math.max(3, uid === L.bot.uin ? 0 : fun.access.get(uid) + 1),
			"Needed level > the settee unless it's WillBot, and >= 3 when changing others' card"
		)
		L.bot.setGroupCard(L.msg.group_id, uid, card)
		return `Op: Whatever ${ uid ? "one" : "I" } name, `
			+ `${ uid === L.bot.uin ? "my" : "wish his" } will won't change.`
	},
	like: ([ id, times ] = [ "!=U", "u" ]) => {3 // Send 10 likes to specific [id] or yourself.
		id ||= L.msg.user_id
		L.bot.sendLike(id, times ?? 10)
		return "Op: Greet the one favored by the Upper Will."
	},
	gag: ([ uid, duration ] = [ "U", "=u" ]) => {0 // Gag [uid] or yourself for [duration] seconds.
		if (uid !== L.msg.user_id) fun.access.req(
			Math.max(3, fun.access.get(uid) + 1),
			"Needed level > the settee and >= 3 when gagging others"
		)
		L.bot.setGroupBan(L.msg.group_id, uid ?? L.msg.user_id, duration ?? 60)
		return "Op: Silence is good sacrifice to the Upper Will."
	},
	withdraw: ([ mid ] = [ "=s" ]) => {3 // Withdraw a message with [mid]
		L.bot.deleteMsg(mid)
		return "Op: Secrets are to be revealed."
	}
})
