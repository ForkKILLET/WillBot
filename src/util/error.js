import chalk from 'chalk'

export const showErr = f => theme => err => {
	f(theme)
	if (err instanceof Error)
		f(chalk.red(err.stack.replace(/\n([^]*)/g, s => chalk.yellow(s))))
	else
		f(err)
	if (err instanceof AggregateError)
		f('Errors:\n%s', chalk.red(err.errors.join('\n')))
	process.exit(1)
}
