import { format }	from 'pretty-format'
import vm			from 'vm'
import Scm			from 'schemastery'

export default ({ command: { CmdError } }) => ({
	subs: {
		echo: {
			alias: [ 'say' ],
			help: 'Send <sentence> in the current context. Send error with --error on.',
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
			help: 'Send configured hello text.',
			args: [ { ty: '$cfg' } ],
			fn: (cfg) => {
				return cfg.hello
			}
		},

		eval: {
			perm: 1,
			alias: [ '~' ],
			help: 'Evaluate JavaScript <code>',
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

		tokenize: {
			help: 'Show tokens and flags of <input>.',
			args: [
				{ ty: '$tokens' },
				{ ty: '$flags' },
				{ ty: 'text', name: 'input' }
			],
			fn: (tokens, flags, input) => (
				`input: ${input}\ntokens: ${format(tokens)}\nflags: ${format(flags)}`
			)
		}
	}
})

export const onReload = () => {
	bot.logger.info('test onReload')
}

export const config = Scm.object({
	hello: Scm.string().default('Hello world! (default)')
})
