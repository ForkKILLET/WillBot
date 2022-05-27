import Scm from 'schemastery'

const checkAon = (rule, baseFn) => {
	if (rule.all) return rule.all.every(r => checkAon(r, baseFn))
	if (rule.one) return rule.one.some(r => checkAon(r, baseFn))
	if (rule.not) return ! checkAon(rule.not, baseFn)
	return baseFn(rule)
}

const onMessageFactory = (cfg) => async (msg) => {
	const gid = msg.group_id, uid = msg.sender.user_id
	const { raw_message: raw } = msg
	for (const rule of cfg) {
		if (rule.in.id && gid !== rule.in.id) continue
		if (checkAon(rule.on, r => {
			if (r.includes) return checkAon(r.includes, s => raw.includes(s))
			if (r.matches) return checkAon(r.matches, re => raw.match(RegExp(re)))
		})) {
			if (rule.do.recall) {
				await bot.oicq.deleteMsg(msg.message_id)
			}
			if (rule.do.reply) {
				await msg.reply(rule.do.reply)
			}
			if (rule.do.mute) {
				await bot.oicq.setGroupBan(gid, uid, rule.do.mute)
			}
		}
	}
}

let onMessage

export default (_, cfg) => {
	if (! bot.oicq) return
	bot.oicq.on('message.group', onMessage = onMessageFactory(cfg))

	return {
		help: 'Automatic message flow control.'
	}
}

export const onReload = () => {
	bot.oicq.off('message.group', onMessage)
}

const aon = (...bases) => {
	const all = {}
	const one = {}
	const not = {}
	const res = Scm.union([ ...bases, Scm.object(all), Scm.object(one), Scm.object(not) ])
	all.all = Scm.array(res)
	one.one = Scm.array(res)
	not.not = res
	return res
}

export const config = Scm.array(Scm.object({
	name: Scm.string().required(),
	in: Scm.number(),
	on: aon(
		Scm.union([
			Scm.object({
				includes: aon(Scm.string())
			}),
			Scm.object({
				matches: aon(Scm.string())
			})
		])
	),
	do: Scm.object({
		recall: Scm.boolean(),
		mute: Scm.number().default(5 * 60),
		reply: Scm.string()
	})
}))
