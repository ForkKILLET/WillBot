import { findCmd } from '../core/commands.js'

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
			fn: async (alias, command, uid) => {
				if (! alias.match(/^[\w-]+$/))
					return 'Alias name may only contain letters, numbers, underscores and hyphens.'

				await bot.mongo.db
					.collection('my_alias')
					.updateOne(
						{ uid, alias },
						{ $set: { command } },
						{ upsert: true }
					)

				return 'Done.'
			}
		},
		with: {
			help: 'Add a with-command.',
			args: [
				{ ty: 'str', name: 'command' },
				{ ty: '$uid' }
			],
			fn: async (command, uid) => {
				if (! findCmd(command)) return `Command "${command}" not found.`

				const col = await bot.mongo.db.collection('my_with')
				if ((await col.findOne({ _id: uid }))
					?.commands.includes(command)
				) return `With-command "${command}" already added.`

				await col.updateOne(
					{ _id: uid },
					{ $push: { commands: command } },
					{ upsert: true }
				)

				return 'Done.'
			},
			subs: {
				remove: {
					alias: [ 'rm' ],
					help: 'Remove a with-command.',
					args: [
						{ ty: 'str', name: 'command' },
						{ ty: '$uid' }
					],
					fn: async (command, uid) => {
						const col = await bot.mongo.db.collection('my_with')

						const res = await col.updateOne(
							{ _id: uid },
							{ $pull: { commands: command } }
						)

						if (! res.matchedCount) return 'You have no with-commands.'
						if (! res.modifiedCount) return `With-command "${command}" not added.`
						return 'Done.'
					}
				},
				list: {
					alias: [ 'ls' ],
					help: 'List all with-commands.',
					args: [ { ty: '$uid' } ],
					fn: async (uid) => {
						const commands = (await bot.mongo.db
							.collection('my_with')
							.findOne({ _id: uid }))
							?.commands ?? []

						return `You have ${commands.length} with-commands:\n`
							+ commands.slice(0, 10).join('\n')
							+ (commands.length > 10 ? '\n...and more' : '')
					}
				}
			}
		}
	}
}))
