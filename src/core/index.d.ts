import { Client } from 'oicq'
import { MongoClient, Db } from 'mongodb'

declare interface loggerFunc {
	(value: any): void,
	(formatString: string, ...params: any[])
}

declare type loggerFuncNames = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'mark'

declare type Logger = {
	[ name in loggerFuncNames ]: loggerFunc
} & {
	err: (theme: string) => (err: any) => void
}

declare const bot: {
	cliArgs: {
		'rc-path': string, 'p': string,
		'login': boolean
	},
	logger: Logger,
	oicq?: Client,
	mongo: {
		client: MongoClient,
		db: Db
	},
	cfg: any
}
