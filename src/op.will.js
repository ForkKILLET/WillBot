module.exports = L => ({
	sleep: async y => {4 // Let the bot go to bed.
		L.msg.reply("Op: Good night to all free and unbreakable wills. "
			+ (y ? "\n" + y : ""))
		await L.sleep()
	},
	card: ([ uid, card ] = [ "u", "=s" ]) => {4 // Set group card.
		L.bot.setGroupCard(L.msg.group_id, uid ?? L.bot.uin, card)
		console.log(card)
		return "Op: Whatever I name, my will won't change."
	},
	like: ([ id, times ] = [ "=u", "u" ]) => {3 // Send 10 likes to specific [id] or yourself.
		id ||= L.msg.user_id
		L.bot.sendLike(id, times ?? 10)
		return "Op: Greet the one favored by the Upper Will."
	},
	gag: ([ uid, duration ] = [ "u", "=u" ]) => {0 // Gag [uid] or yourself for [duration] seconds.
		console.log(uid, duration)
		L.bot.setGroupBan(L.msg.group_id, uid ?? L.msg.user_id, duration ?? 60)
		return "Op: Silence is good sacrifice to the Upper Will."
	}
})
