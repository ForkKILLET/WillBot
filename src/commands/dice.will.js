import dayjs		from 'dayjs'
import canvas		from 'canvas'
import echarts		from 'echarts'
import { segment }	from 'oicq'

export default ({ command: { CmdError } }) => {
	const subs = {
		jrrp: {
			help: '获取你的今日人品',
			args: [ { ty: '$msg' } ],
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
					help: '获取今天群内人品排行榜',
					args: [
						{ ty: '$msg' },
						{ ty: 'bool', name: 'chart', opt: true }
					],
					fn: async (msg, chart) => {
						if (msg.message_type !== 'group') return '请在群内调用'
						const members = await bot.oicq.getGroupMemberList(msg.group_id)

						const col = bot.mongo.db.collection('dice_rp')

						const now = + dayjs(new Date).startOf('day')
						const top = (await col.find({ day: now })
							.toArray())
							.map(({ uid, rp }) => ({
								member: members.get(uid), rp
							}))
							.filter(({ member }) => member)
							.sort((doc1, doc2) => doc2.rp - doc1.rp)
							.map(({ rp, member }) => ({ rp, name: member.card || member.nickname }))

						if (msg.data_type === 'raw') return top

						if (! top.length) return '今天群内还没有人测过人品哦'

						if (chart || msg.data_type === 'chart') {
							top.reverse()

							const cvs = canvas.createCanvas(800, 500)
							const chart = msg.web
								? echarts.init(null, null, {
									ssr: true,
									renderer: 'svg',
									width: 800,
									height: 500
								})
								: echarts.init(cvs)
							chart.setOption({
								xAxis: {
									type: 'value',
									name: '人品',
									min: 0,
									max: 100
								},
								yAxis: {
									type: 'category',
									name: '群员',
									data: top.map(({ name }) => name)
								},
								series: {
									type: 'bar',
									data: top.map(({ rp }) => rp),
									label: {
										show: true
									}
								},
								backgroundColor: '#fff'
							})

							return msg.web
								? chart.renderToSVGString()
								: segment.image(cvs.toBuffer())
						}

						if (msg.web) return (
							`<h1>今日人品排行榜</h1>` +
							`<p>群：${ msg.group_id }</p>` +
							`<ol>` + top
								.map(({ rp, name }) => `<li>${name}: ${rp}</li>`)
								.join('') +
							`</ol>`
						)
						return '今日人品排行榜\n' + top
							.map(({ rp, name }) => `${name}: ${rp}`)
							.join('\n')
					}
				},
				history: {
					help: '获取您的历史人品',
					args: [
						{ ty: 'bool', name: 'chart', opt: true, perm: 1 },
						{ ty: '$uid' }
					],
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
								min: 0,
								max: 100
							},
							series: {
								type: 'line',
								data: docs.map(({ rp }) => rp),
								label: {
									show: true
								}
							},
							backgroundColor: '#fff'
						})

						return segment.image(cvs.toBuffer())
					}
				}
			}
		},

		d: {
			help: '掷骰，范围 1 到 <max>',
			args: [ { ty: 'num', name: 'max', int: true } ],
			fn: (max) => {
				if (max <= 0) return new CmdError('掷骰范围必须是正数')
				if (max >= 1e6) return new CmdError('掷骰范围太大')
				return String((Math.random() * 1e6 | 0) % max + 1)
			}
		}
	}

	bot.fastify.server?.get?.('/jrrp/top', async (req, res) => {
		const { uid, gid, passwd, type = 'text' } = req.query
		
		if (type === 'raw') res.type('application/json; charset=utf-8')
		else res.type('text/html; charset=utf-8')
		
		if (! await bot.mongo.db
			.collection('auth')
			.findOne({ _id: + uid, passwd })
		) return `<p>Auth failure.</p>`

		return await subs.jrrp.subs.top.fn({
			message_type: 'group',
			group_id: + gid,
			web: true,
			data_type: type
		})
	})

	return {
		help: '骰子相关命令',
		subs
	}
}