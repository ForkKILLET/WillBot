import { MongoClient }	from 'mongodb'

const { addr, port, name } = bot.cfg.database
const uri = encodeURI(`mongodb://${addr}:${port}`)

export const client = new MongoClient(uri, { connectTimeoutMS: 5 * 1000 })

export let db

export const connect = async () => {
	bot.logger.mark(`Connecting MongoDb at ${uri}.`)
	await bot.mongo.client.connect()
	db = bot.mongo.client.db(name ?? 'willbot')
	bot.logger.mark('Connected.')
}
