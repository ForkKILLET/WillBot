import chalk from 'chalk'

export const showErr = f => (theme, exit) => err => {
	f(theme)
	if (err instanceof Error)
		f(chalk.red(err.stack.replace(/\n([^]*)/g, s => chalk.yellow(s))))
	else
		f('%o', err)
	if (err instanceof AggregateError)
		f('Errors:\n%s', chalk.red(err.errors.join('\n')))
	if (typeof exit === 'number') process.exit(exit)
}
