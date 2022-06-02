export default () => ({
	subs: {
		mark: {
			args: [ { ty: '$quote' } ],
			fn: quote => {
				return `Mark: ${quote.message}`
			}
		}
	}
})
