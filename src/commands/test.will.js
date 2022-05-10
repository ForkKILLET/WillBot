export default () => ({
	subs: {
		echo: {
			alias: [ 'say' ],
			args: [ { name: 'sentence', ty: 'text' } ],
			help: 'send <sentence> in the current context',
			fn: (sen) => sen || '(empty message)'
		}
	}
})
