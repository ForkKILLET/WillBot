// From: https://github.com/nodejs/node/issues/30810
const { emitWarning } = process
process.emitWarning = (warning, ...args) => {
	if (args[0]?.type ?? args[0] === 'ExperimentalWarning') return
	return emitWarning(warning, ...args)
}
