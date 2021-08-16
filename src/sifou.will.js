const fetch = require("node-fetch")
const htmlEntities = require("html-entities")

String.prototype.padIndent ??= function (n) {
	return this.replace(RegExp(String.raw`^\t{${n}}`, "gm"), "")
}

module.exports = (L, fun) => ({
	get: () => {0, "/" // Get your SegmentFault username.
		return `SiFou: You are ${ L.sto.sifou?.[L.msg.user_id]?.user ?? "not recorded" }.`
	},
	set: user => {0, "%" // Set your SegmentFault [user]name.
		; ((L.sto.sifou ??= {})[L.msg.user_id] ??= {}).user = user
		L.msg.reply(`SiFou: Getting a card for ${user}.`)
		return fun.sifou.card()
	},
	card: async user => {0 // Get SegmentFault [user] card.
		user ||= L.sto.sifou?.[L.msg.user_id]?.user
		const res = await fetch(`https://gateway.segmentfault.com/homepage/${user}/info`)
		const info = JSON.parse(await res.text())
		if ([ "Unauthorized", "Not Found" ].includes(info)) return "SiFou: User stat is abnormal."
		const desc = htmlEntities
			.decode(info.parsed_text)
			.replace(/<p>([^]*?)<\/p>/g, (_, i) => i)
			.replace(/<code>([^]*?)<\/code>/g, (_, i) => "`" + i + "`")
		return `
			${info.name} 🏅${info.rank} ${ [ "♀️", "♂️" ][info.gender] } ❤️${info.likes}
			ℹ️ ${ desc }
			🌐${ info.profile.site } & https://segmentfault.com/u/${user}
		`.padIndent(3).trim()
	}
})
