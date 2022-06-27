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

export const cloneJSON = val => JSON.parse(JSON.stringify(val))

export const itemOrArray = val => Array.isArray(val) ? val : [ val ]

export const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
export const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor
export const AsyncGeneratorFunction = Object.getPrototypeOf(async function* () {}).constructor

export const sleep = ms => new Promise(res => setTimeout(res, ms))

export const randomItem = arr => arr[ (Math.random() * 1e8 | 0) % arr.length ]