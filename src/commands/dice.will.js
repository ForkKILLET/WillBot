import dayjs from 'dayjs'

export default () => ({
	help: '骰子相关命令',
	subs: {
		jrrp: {
			args: [ { ty: '$msg' } ],
			help: '获取你的今日人品',
			fn: async (msg) => {
				const uid = msg.sender.user_id
				const col = bot.mongo.db.collection('dice')
				const rec = await col.findOne({ _id: uid }) ?? {}

				const now = new Date
				if (! rec.date || ! dayjs(rec.date).isSame(now, 'day')) {
					const todayRp = (Math.random() * 1e6 | 0) % 101
					await col.updateOne(
						{ _id: uid },
						{ $set: {
							todayRp,
							date: now
						} },
						{ upsert: true }
					)
					return `你今天的人品是 ${todayRp}`
				}
				return `今天已经测过人品啦，是 ${rec.todayRp}`
			},
			subs: {
				top: {
					args: [ { ty: '$msg' } ],
					help: '获取今天群内人品排行榜',
					fn: async (msg) => {
						if (msg.message_type !== 'group') return '请在群内调用'
						const members = await bot.oicq.getGroupMemberList(msg.group_id)

						const col = bot.mongo.db.collection('dice')

						const now = new Date
						return '今日人品排行榜' + (await col.find()
							.toArray())
							.filter(({ date }) => dayjs(date).isSame(now, 'day'))
							.sort((rec1, rec2) => rec2.todayRp - rec1.todayRp)
							.map(({ _id, todayRp }) => {
								const member = members.get(_id)
								return member
									? `\n${member.card || member.nickname}: ${todayRp}`
									: ''
							})
							.join('') || '今天群内还没有人测过人品哦'
					}
				}
			}
		}
	}
})
