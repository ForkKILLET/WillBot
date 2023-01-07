import { findCmd } from '../core/commands.js'

export default (() => ({
	help: 'Customize your WillBot β',
	subs: {
		alias: {
			help: 'Add an <alias> for <command>.',
			args: [
				{ ty: 'str', name: 'alias' },
				{ ty: 'str', name: 'command' },
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
			},
			subs: {
				remove: {
					alias: [ 'rm' ],
					help: 'Remove an <alias>.',
					args: [
						{ ty: 'str', name: 'alias' },
						{ ty: '$uid' }
					],
					fn: async (alias, uid) => {
						const res = await bot.mongo.db
							.collection('my_alias')
							.deleteOne({ uid, alias })

						return res.deletedCount
							? 'Done.'
							: `Alias "${alias}" not added.`
					}
				},
				list: {
					alias: [ 'ls' ],
					help: 'List all aliases.',
					args: [ { ty: '$uid' } ],
					fn: async (uid) => {
						const aliases = await bot.mongo.db
							.collection('my_alias')
							.find({ uid })
							.toArray()

						return `You have ${aliases.length} alias(es):\n`
							+ aliases
								.slice(0, 10)
								.map(({ alias, command }) => `${alias} -> ${command}`)
								.join('\n')
							+ (aliases.length > 10 ? '\n...and more' : '')
					}
				}
			}
		},
		with: {
			help: 'Add a with-<command> to path.',
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
					help: 'Remove a with-<command> from path.',
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
					help: 'List all with-commands in path.',
					args: [ { ty: '$uid' } ],
					fn: async (uid) => {
						const commands = (await bot.mongo.db
							.collection('my_with')
							.findOne({ _id: uid }))
							?.commands ?? []

						return `You have ${commands.length} with-command(s):\n`
							+ commands.slice(0, 10).join('\n')
							+ (commands.length > 10 ? '\n...and more' : '')
					}
				}
			}
		},
		env: {
			help: 'Add an <env> with a value of <val>.',
			args: [
				{ ty: 'str', name: 'env' },
				{ ty: 'str', name: 'val' },
				{ ty: '$uid' }
			],
			fn: async (env, val, uid) => {
				if (! env.match(/^[\w-]+$/))
					return 'Env name may only contain letters, numbers, underscores.'

				await bot.mongo.db
					.collection('my_env')
					.updateOne(
						{ _id: uid },
						{ $set: { [`env.${env}`]: val } },
						{ upsert: true }
					)

				// Note: Update cache.
				bot.userEnv[uid][env] = val

				return 'Done.'
			},
			subs: {
				remove: {
					alias: [ 'rm' ],
					help: 'Remove an <env>.',
					args: [
						{ ty: 'str', name: 'alias' },
						{ ty: '$uid' }
					],
					fn: async (env, uid) => {
						const res = await bot.mongo.db
							.collection('my_env')
							.updateOne(
								{ _id: uid },
								{ $unset: { [`env.${env}`]: 1 } }
							)

						// Note: Update cache.
						delete bot.userEnv[uid][env]

						return res.modifiedCount
							? 'Done.'
							: `Env "${env}" not added.`
					}
				},
				list: {
					alias: [ 'ls' ],
					help: 'List all envs.',
					args: [ { ty: '$uid' } ],
					fn: async (uid) => {
						const envs = (await bot.mongo.db
							.collection('my_env')
							.findOne({ _id: uid }))
							?.env ?? {}

						const entries = Object.entries(envs)
						return `You have ${entries.length} env(s):\n`
							+ entries
								.slice(0, 10)
								.map(([	env, val ]) => `${env} -> ${val}`)
								.join('\n')
							+ (entries.length > 10 ? '\n...and more' : '')
					}
				}
			}
		}
	}
}))
