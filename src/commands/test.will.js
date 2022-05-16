import { format }	from 'pretty-format'
import vm			from 'vm'

export default () => ({
	subs: {
		echo: {
			alias: [ 'say' ],
			help: 'send <sentence> in the current context',
			args: [ { name: 'sentence', ty: 'text' } ],
			fn: (sen) => sen || '(empty message)'
		},

		eval: {
			alias: [ '~' ],
			help: 'evaluate JavaScript <code>',
			args: [
				{ name: 'globals', ty: 'str', named: true },
				{ name: 'code', ty: 'text' }
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
					return format(err)
				}
			}
		}
	}
})
