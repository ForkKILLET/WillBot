export default ({ command: { CmdError } }) => ({
	help: 'Authorize with WillBot.',
	subs: {
		passwd: {
			help: 'Set your password.',
			args: [
				{ ty: '$msg' },
				{ ty: '$uid' },
				{ ty: 'str', name: 'passwd', opt: true }
			],
			fn: async (msg, uid,  passwd) => {
				if (msg.message_type !== 'private')
					return new CmdError('Password must be set privately.')

				if (passwd == null) return (await bot.mongo.db
					.collection('auth')
					.findOne({ _id: uid }))
					?.passwd ?? '(no passwd)'

				await bot.mongo.db
					.collection('auth')
					.updateOne(
						{ _id: uid },
						{ $set: { passwd } },
						{ upsert: true }
					)
				return 'Done.'
			}
		}
	}
})
