export default (() => ({
	help: 'OICQ APIs',
	perm: 5,
	args: [
		{ ty: 'words', name: 'api' },
	],
	fn: async ([ api, ...args ]) => {
		return await bot.oicq[api](...args.map(i => {
			try {
				return JSON.parse(i)
			}
			catch {
				return i
			}
		}))
	}
}))
