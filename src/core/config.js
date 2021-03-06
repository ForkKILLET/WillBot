import fs	from 'node:fs/promises'
import path	from 'node:path'
import yaml	from 'js-yaml'
import Scm	from 'schemastery'

export const configRule = Scm.object({
	log: Scm.object({
		level: Scm.string().default('info'),
		oicqLevel: Scm.string().default('warn'),
		file: Scm.string(),
		stdout: Scm.boolean()
	}),
	account: Scm.object({
		uin: Scm.number().required(),
		pw: Scm.union([ Scm.string(), Scm.never() ]),
		platform: Scm.union([ 1, 2, 3, 4, 5 ])
	}),
	database: Scm.object({
		addr: Scm.string().required(),
		port: Scm.number().required(),
		name: Scm.string()
	}),
	server: Scm.object({
		port: Scm.number()
	}),
	repl: Scm.object({
		prompt: Scm.object({
			eval: Scm.string(),
			command: Scm.string()
		}),
		'new-session': Scm.object({
			cmd: Scm.string(),
			args: Scm.array(Scm.string())
		})
	}),
	commands: Scm.object({
		prompts: Scm.array(Scm.string()).required(),
		'error-prefix': Scm.string()
	})
})

export const getConfig = async (name = 'config', rule = configRule) => {
	try {
		const text = await fs.readFile(path.resolve(bot.cliArg['rc-path'], `${name}.yml`))
		const config = yaml.load(text)
		return rule(config)
	}
	catch (err) {
		if (err.code === 'ENOENT') return null
		throw err
	}
}


