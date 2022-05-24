export default () => ({
	help: 'Print effective user id.',
	args: [ { ty: '$uid' } ],
	fn: uid => uid.toString()
})
