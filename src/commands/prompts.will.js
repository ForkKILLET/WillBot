export default () => ({
	help: 'Show available prompts',
	args: [],
	fn: () => {
		const { prompts } = bot.cfg.commands
		return `${prompts.length} prompts(s):\n` + prompts.join('\n')
	}
})
