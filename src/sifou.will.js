const fetch = require("node-fetch")
const htmlEntities = require("html-entities")

module.exports = (L) => {
	const me = {
		get: (_, man) => {0, "/" // Get your SegmentFault username.
			return man
				? `SiFou: You are ${ L.sto.sifou?.[L.msg.user_id]?.user ?? "not recorded" }.`
				: L.sto.sifou?.[L.msg.user_id]?.user
		},
		set: user => {0, "%" // Set your SegmentFault [user]name.
			; ((L.sto.sifou ??= {})[L.msg.user_id] ??= {}).user = user
			L.msg.reply(`SiFou: Getting a card for ${user}.`)
			return me.card()
		},
		card: async user => {0 // Get SegmentFault [user] card.
			user ||= me.get()
			const res = await fetch(`https://gateway.segmentfault.com/homepage/${user}/info`)
			const info = JSON.parse(await res.text())
			if ([ "Unauthorized", "Not Found" ].includes(info)) return "SiFou: User stat is abnormal."
			const desc = htmlEntities
				.decode(info.parsed_text)
				.replace(/<p>([^]*?)<\/p>/g, (_, i) => i)
				.replace(/<code>([^]*?)<\/code>/g, (_, i) => "`" + i + "`")
			return `
				${info.name} 🏅${info.rank} ${ [ "♀️", "♂️" ][info.gender] } ❤️${info.likes}
				ℹ️ ${ desc || "(empty)" }
				🌐${ info.profile.site || "(empty)" } & https://segmentfault.com/u/${user}
			`.padIndent(3).trim()
		},
		timeline: async user => {0
			user ||= me.get()
			const res = await fetch(`https://gateway.segmentfault.com/homepage/${user}/timeline?size=20`)
			const info = JSON.parse(await res.text())
			console.log(info)
		}
	}
	return me
}
