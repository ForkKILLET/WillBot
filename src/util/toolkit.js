// From: https://github.com/hydro-dev/Hydro/blob/master/packages/utils/lib/utils.ts
export const streamToBuffer = (stream, maxSize = 0) => (
	new Promise((resolve, reject) => {
		const buffers = []
		let length = 0
		function onData(data) {
			buffers.push(data)
			length += data.length
			if (maxSize && length > maxSize) {
				stream.removeListener('data', onData)
				reject(Error('Buffer length exceeded'))
			}
		}
		stream.on('error', reject)
		stream.on('data', onData)
		stream.on('end', () => resolve(Buffer.concat(buffers)))
	})
)

export const cloneJSON = value => JSON.parse(JSON.stringify(value))
