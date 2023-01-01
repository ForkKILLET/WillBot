import dayjs			from 'dayjs'
import canvas			from 'canvas'
import echarts			from 'echarts'
import { segment }		from 'oicq'
import { randomItem }	from '../util/toolkit.js'

export default ({ command: { CmdError } }) => {
	const subs = {
		jrrp: {
			help: '获取你的今日人品',
			args: [ { ty: '$msg' } ],
			fn: async ({ sender: { user_id: uid, nickname } }) => {
				const col = bot.mongo.db.collection('dice_rp')

				const now = + dayjs(new Date).startOf('day')
				const doc = await col.findOne({ uid, day: now })
				const name = nickname ? nickname + ' ' : '你'

				const CELEBRATE = false

				if (CELEBRATE) {
					await col.updateOne(
						{ uid, day: now },
						{ $set: { rp: 100 } },
						{ upsert: true }
					)
					return `${name}，新年快乐！今天你的人品是 100！`
				}

				if (! doc) {
					const rp = (Math.random() * 1e6 | 0) % 101
					await col.insertOne({ uid, day: now, rp })
					return `${name}今天的人品是 ${rp}`
				}
				return `${name}今天已经测过人品啦，是 ${doc.rp}，再怎么测都不会变的了啦……`
			},
			subs: {
				average: {
					help: '获取今天群内的平均人品',
					args: [
						{ ty: '$msg' },
						{ ty: 'bool', name: 'comp', opt: true }
					],
					fn: async (msg, comp) => {
						if (msg.message_type !== 'group') return '请在群内调用'
						const members = await bot.oicq.getGroupMemberList(msg.group_id)

						const now = + dayjs(new Date).startOf('day')
						const all = (await bot.mongo.db
							.collection('dice_rp')
							.find({ day: now })
							.toArray())
							.filter(({ uid }) => members.get(uid))

						if (! all.length) return '今天群内还没有人测过人品'

						const sum = all.reduce((a, { rp }) => a + rp, 0)
						const average = sum / all.length

						const me = all.find(({ uid }) => uid === msg.sender.user_id) 

						return `今天群内的平均人品是 ${average.toFixed(2)}`
							+ (comp
								? me
									? `，你的人品和平均的差值是 ${(me.rp - average).toFixed(2)}`
									: '，但你今天还没有测人品哦'
								: ''
							)
					}
				},
				top: {
					help: '获取今天群内人品排行榜',
					args: [
						{ ty: '$msg' },
						{ ty: 'bool', name: 'chart', opt: true }
					],
					fn: async (msg, chart = true) => {
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
						{ ty: '$uid' },
						{ ty: 'bool', name: 'chart', opt: true }
					],
					fn: async (uid, useChart = true) => {
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
		},

		din: {
			help: '从给定的选项中等概率随机抽取一个',
			args: [ { ty: 'words', name: 'items' } ],
			fn: (items) => {
				if (! items.length) return '没有待抽取的选项'
				return String(randomItem(items))
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
