import dayjs		from 'dayjs'
import canvas		from 'canvas'
import echarts		from 'echarts'
import { segment }	from 'oicq'

export default () => ({
	help: '骰子相关命令',
	subs: {
		jrrp: {
			args: [ { ty: '$msg' } ],
			help: '获取你的今日人品',
			fn: async (msg) => {
				const uid = msg.sender.user_id
				const col = bot.mongo.db.collection('dice_rp')

				const now = + dayjs(new Date).startOf('day')
				const doc = await col.findOne({ uid, day: now })

				if (! doc) {
					const rp = (Math.random() * 1e6 | 0) % 101
					await col.insertOne({ uid, day: now, rp })
					return `你今天的人品是 ${rp}`
				}
				return `今天已经测过人品啦，是 ${doc.rp}`
			},
			subs: {
				top: {
					args: [ { ty: '$msg' } ],
					help: '获取今天群内人品排行榜',
					fn: async (msg) => {
						if (msg.message_type !== 'group') return '请在群内调用'
						const members = await bot.oicq.getGroupMemberList(msg.group_id)

						const col = bot.mongo.db.collection('dice_rp')

						const now = + dayjs(new Date).startOf('day')
						return '今日人品排行榜' + (await col.find({ day: now })
							.toArray())
							.sort((doc1, doc2) => doc2.rp - doc1.rp)
							.map(({ uid, rp }) => {
								const member = members.get(uid)
								return member
									? `\n${member.card || member.nickname}: ${rp}`
									: ''
							})
							.join('') || '今天群内还没有人测过人品哦'
					}
				},
				history: {
					args: [
						{ ty: 'bool', name: 'chart', opt: true },
						{ ty: '$uid' }
					],
					help: '获取您的历史人品',
					fn: async (useChart, uid) => {
						const docs = (await bot.mongo.db.collection('dice_rp')
							.find({ uid })
							.toArray())
							.sort((doc1, doc2) => doc1.day - doc2.day)

						if (! useChart) return docs
							.map(({ day, rp }) => dayjs(day).format('YYYY-MM-DD') + ': ' + rp)
							.join('\n') || '你还没有历史人品'

						const cvs = canvas.createCanvas(800, 600)
						const chart = echarts.init(cvs)
						chart.setOption({
							xAxis: {
								type: 'category',
								data: docs.map(({ day }) => dayjs(day).format('YYYY-MM-DD'))
							},
							yAxis: {
								type: 'value',
								name: '人品',
							},
							series: {
								type: 'line',
								data: docs.map(({ rp }) => rp)
							},
							backgroundColor: '#fff'
						})

						return segment.image(cvs.toBuffer())
					}
				}
			}
		}
	}
})
