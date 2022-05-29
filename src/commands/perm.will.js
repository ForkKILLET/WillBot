export default (({ command: { CmdError }, mongo }) => ({
	subs: {
		set: {
			perm: 3,
			help: 'Set <uid>\'s permission level to <level>',
			args: [
				{ ty: 'num', name: 'uid' },
				{ ty: 'num', name: 'level' },
				{ ty: '$checkPerm', user: true }
			],
			fn: async (uid, level, cp) => {
				if (uid === 0) return new CmdError('Can\'t set WillBot\'s permission.')

				cp(level, 'lower permission level then the target level')

				await cp.user(uid, 'lower permission level than the target user')

				await mongo.db
					.collection('perm')
					.updateOne(
						{ _id: uid },
						{ $set: { level } },
						{ upsert: true }
					)

				return 'Done.'
			}
		},
		get: {
			help: 'Get <uid>\'s permission level.',
			args: [
				{ ty: 'num', name: 'uid', opt: true },
				{ ty: '$uid' }
			],
			fn: async (uid, myUid) => {
				return (
					(await mongo.db
						.collection('perm')
						.findOne({ _id: uid ?? myUid }))
						?.level ?? 0
				).toString()
			}
		}
	}
}))
