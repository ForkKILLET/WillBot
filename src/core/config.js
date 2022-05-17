import fs	from 'node:fs/promises'
import path	from 'node:path'
import yaml	from 'js-yaml'

export const getConfig = async (bot) => {
	const text = await fs.readFile(path.resolve(bot.cliArg['rc-path'], 'config.yml'))
	const config = yaml.load(text)
	checkConfig(config)
	return config
}

export const configRule = {
	log: {
		level: 'string?',
		file: 'string?',
		stdout: 'boolean?'
	},
	account: {
		uin: 'number',
		pw: 'string'
	},
	database: {
		addr: 'string',
		port: 'number',
		name: 'string?'
	},
	repl: {
		prompt: 'string?',
		'new-session': {
			cmd: 'string?',
			args: [ 'string?' ]
		}
	},
	commands: {
		prompts: [ 'string' ],
		'error-prefix': 'string?'
	},
}

export const checkConfig = (config) => {
	let errs = []
	const f = (item, setItem, rule, path) => {
		const type = typeof rule
		if (type === 'object') {
			if (Array.isArray(rule)) {
				if (item === undefined) item = setItem([])
				if (! Array.isArray(item)) errs.push([ path, 'array' ])
				for (const [ key, value ] of item.entries()) {
					f(value, v => item[key] = v, rule[0], path + '[]')
				}
			}
			else {
				if (item === undefined) item = setItem({})
				if (! item || typeof item !== 'object') errs.push([ path, 'object' ])
				for (const key in rule) {
					f(item[key], v => item[key] = v, rule[key], path + '.' + key)
				}
			}
		}
		else if (type === 'string') {
			let basicRule = rule
			if (rule.endsWith('?')) {
				basicRule = rule.slice(0, -1)
				if (item === undefined) return 
			}
			if (basicRule !== typeof item) errs.push([ path, rule ])
		}
	}
	f(config, v => config = v, configRule, '')
	errs = errs.map(([ path, type ]) => `${path} is not of type ${type}`)
	if (errs.length) throw new AggregateError(errs, 'illegal config')
}
