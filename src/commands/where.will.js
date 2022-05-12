export default (() => ({
	help: 'Show the path of a <command>',
	args: [ { ty: 'text', name: 'command' } ],
	fn: (name) => {
		const result = []
		const find = (cmd, path) => {
			for (const subName in cmd.subs) {
				if (subName === name) result.push(path.slice(1) + '.' + subName)
				const sub = cmd.subs[subName]
				if (! sub || sub === bot.command.helphelp) continue
				find(sub, path + '.' + subName)
			}
		}
		find(bot.cmds, '')
		return name + `: ${result.length} result(s)`
			+ (result.length
				? ('\n' + result.slice(0, 10).join('\n')
					+ (result.length > 10 ? '\n...and more' : '')
				)
				: ''
			)
	}
}))
