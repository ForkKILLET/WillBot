export default (() => ({
	help: 'Customize your WillBot β',
	subs: {
		alias: {
			help: 'Add an alias',
			args: [
				{ ty: 'str', name: 'alias' },
				{ ty: 'text', name: 'command' },
				{ ty: '$uid' }
			],
			fn: async (alias, cmd, uid) => {
				if (! alias.match(/^[\w-]+$/))
					return 'Alias name may only contain letters, numbers, underscores and hyphens.'

				await bot.mongo.db
					.collection('custom')
					.updateOne(
						{ _id: uid },
						{ $set: { [`alias.${alias}`]: cmd } },
						{ upsert: true }
					)

				return 'Done.'
			}
		}
	}
}))
