export default () => ({
	subs: {
		mark: {
			args: [ { ty: '$quote' } ],
			fn: quote => {
				console.log(quote)
				return `Mark: ${quote.message}, id: ${quote.message_id}`
			}
		}
	}
})
