export default (({ command: { runCmd, CmdError } }) => ({
	help: 'Execute a <command> as another <uid>.',
	perm: 3,
	args: [
		{ ty: 'num', name: 'uid' },
		{ ty: 'text', name: 'command' },
		{ ty: '$checkPerm', user: true },
		{ ty: '$msg' }
	],
	fn: async (uid, cmd, cp, msg) => {
		if (uid === 0) return new CmdError('Can\'t sudo WillBot.')

		await cp.user(uid, 'lower permission than sudoee')

		msg.sender.user_id = uid
		msg.raw_message = cmd

		await runCmd(msg)
	}
}))
