import cp				from 'node:child_process'
import vm				from 'node:vm'
import { promisify }	from 'node:util'
import { format }		from 'pretty-format'
import Scm				from 'schemastery'
import { sleep }		from '../util/toolkit.js'

export default ({ command: { CmdError } }) => ({
	subs: {
		echo: {
			alias: [ 'say' ],
			help: 'Test reply. Send <sentence> in the current context. Send error with --error on.',
			args: [
				{ ty: 'bool', name: 'error', named: true },
				{ ty: 'text', name: 'sentence' }
			],
			fn: (error, sen) => {
				sen ||= '(empty message)'
				return error ? new CmdError(sen) : sen
			}
		},

		hello: {
			help: 'Test config. Send configured hello text.',
			args: [ { ty: '$cfg' } ],
			fn: (cfg) => {
				return cfg.hello
			}
		},

		eval: {
			perm: 1,
			alias: [ '~' ],
			help: 'Test sandbox. Evaluate JavaScript <code>',
			args: [
				{ ty: 'str', name: 'globals', named: true, perm: 5 },
				{ ty: 'text', name: 'code' }
			],
			fn: async (globals, code) => {
				try {
					const context = Object.create(null)
					globals?.split(',')?.forEach(key => context[key] = global[key])
					let res = vm.runInContext(code, vm.createContext(context))
					if (res instanceof Promise) res = await res
					return format(res)
				}
				catch (err) {
					return new CmdError(format(err))
				}
			}
		},

		shell: {
			help: 'Run command in shell',
			alias: [ '$' ],
			perm: 5,
			args: [ { ty: 'text', name: 'code' } ],
			async * fn(code) {
				let stdout, stderr
				// TODO: Abort
				try {
					({ stdout, stderr } = await promisify(cp.exec)(code, {
						timeout: 10 * 1000
					}))
					return
				}
				catch (err) {
					({ stdout, stderr } = err)
					yield new CmdError(err.message + ` (exit code ${err.code})`)
				}
				finally {
					if (stdout) yield stdout
					if (stderr) yield new CmdError(stderr)
					if (! stdout && ! stderr) yield '(empty stdout and stderr)'
				}
			}
		},

		tokenize: {
			help: 'Test tokenizing. Show tokens and flags of <input>.',
			args: [
				{ ty: '$tokens' },
				{ ty: '$flags' },
				{ ty: 'text', name: 'input' }
			],
			fn: (tokens, flags, input) => (
				`input: ${input}\ntokens: ${format(tokens)}\nflags: ${format(flags)}`
			)
		},

		generator: {
			help: 'Test the generator command. Send `1` and then `2` after a second.',
			args: [],
			async * fn() {
				yield '1'
				await sleep(1000)
				yield '2'
			}
		},

		msg: {
			help: 'Test oicq message.',
			args: [ { ty: '$msg' } ],
			fn: msg => JSON.stringify(msg)
		}
	}
})

export const onReload = () => {
	bot.logger.info('test onReload')
}

export const config = Scm.object({
	hello: Scm.string().default('Hello world! (default)')
})
