// :: Import

const mm = require("minimist")

// :: Util

const type = {
	Error: class extends TypeError {
		constructor(msg) {
			super(msg)
			this.code = "WillBot::ArgTypeErr"
		}
		when(f, a) {
			this.message = `Arg: When parsing arg "${a}" for "${f}" got ${this.message}`
			return this
		}
	},
	s: s => s,
	u: s => {
		const v = Number(s)
		if (isNaN(v)) throw new type.Error(`${s} is not a number.`)
		if (v < 0) throw new type.Error(`${s} is not unsigned.`)
		return v
	},
	b: s => {
		if (typeof s !== "boolean") throw new type.Error(`${s} is not a boolean`)
		return s
	}
}

// :: Main

const L = {}

const whats_fun = cmd => {
	let f = fun
	cmd = cmd.split(".")
	while (cmd.length) {
		f = f[ cmd.shift() ]
		if (! f) return null
	}
	return f
}

const init_fun = f => {
	for (const i of Object.keys(f)) switch (typeof f[i]) {
	case "string":
		f[i] = require(`./${ f[i] === "*" ? i : f[i] }.will`)(L, fun)
	case "object":
		f[i]["?"] = () => {0
			let h = "Ψ: Subcommands: " + Object.keys(f[i])
				.map(j => `${j}(${ f[i][j].alias ? "^": "" }${ f[i][j].lv ?? "*" })`)
				.join(", ")
			if (f[i] === fun)
				h += `\n\nname(access), (*) has more subcommands, (^) is an alias, "_" is self, "?" is help`
			return h
		}
		init_fun(f[i])
		break
	case "function":
		const fs = f[i].toString()

		const param = fs
			.match(/\(\[ (?<name>(\w+(, )?)+) \] = \[ (?<req>(".+?"(, )?)+) \]\) =>/)
			?.groups
		const meta = fs
			.match(/=> {(?<lv>(-?(0|[1-9]\d*)(\.\d+)?))(?<alias>(, ".+?")+)?( \/{2} (?<desc>.+?)\n)?/)
			.groups

		let { lv, alias, desc } = meta

		if (param) {
			const req = param.req.split(", ")
			desc += "\n\nUsage: "
			f[i].param = param.name.split(", ").map((v, k) => {
				let s = req[k].slice(1, -1)

				const f_e = s[0] === "!"
				if (f_e) s = s.slice(1)
				const f_d = s[0] === "="
				if (f_d) s = s.slice(1)

				desc += (f_e ? "< " : "[ ")
					+ (f_d ? "[" : "")
					+ `--${v}|-${v[0]}`
					+ (f_d ? "]": "")
					+ ` <${s}>`
					+ (f_e ? " >" : " ]")
					+ " "
				return [ v, s, f_d, f_e ]
			})
		}

		f[i].lv = + lv
		f[i]["?"] = () => `Ψ: ${i}(${lv})`
			+ (alias ? ` -> [ ${ alias.join(", ") } ]` : "")
			+ `: ${desc}`
		f[i]["?"].lv = 0

		; (alias = alias
			?.split(", ")
			?.filter(n => n)
			?.map(n => n.slice(1, -1)))
			?.forEach?.(n => {
				f[n] = f[i].clone()
				f[n]["?"] = () => `Ψ: ${n}(${lv}) <- ${i}: ${desc}`
				f[n]["?"].lv = 0
				f[n].alias = true
			})
		break
	}
}

const will = async (raw, new_L) => {
	Object.assign(L, new_L, { raw })

	let [ cmd, arg ] = raw.split(/(?<! .*) +/), real_cmd

	const withs = L.sto.with?.[L.msg.user_id] ?? []
	let f; for (const w of withs)
		if (f ??= whats_fun(real_cmd = w + "." + cmd))
			break
	f ??= whats_fun(real_cmd = cmd)

	if (! f) return L.msg.reply(`Ψ: Command doesn't exist.`)
	if (typeof f === "object") f = f._ ?? f["?"]

	try {
		fun.access.req(f.lv)
		if (f.param) {
			const ps = mm((arg ?? []).split(/\s+/))
			arg = []
			for (const [ name, req, f_d, f_e ] of f.param) {
				let a = undefined
				a = ps[name] ?? ps[name[0]]
				if (f_d) a ??= ps._.join(" ")

				try {
					arg.push(type[req](a))
				}
				catch (err) {
					if (f_e) throw err.when(real_cmd, name)
					else arg.push(undefined)
				}
			}
		}
		const reply = await f(arg ?? "", true, arg)
		if (reply !== undefined) await L.msg.reply(reply)
	}
	catch (err) {
		switch (err?.code) {
		case "WillBot::AccessErr":
		case "WillBot::ArgTypeErr":
			await L.msg.reply(err.message)
			break
		default:
			L.bot.logger.error(err)
		}
	}
	finally {
		const log = L.sto.log ??= { cmds: [], on: true }
		if (! raw.match(/^[!>]/) && log.on) log.cmds.unshift(raw)
	}
}

const access = {
	Error: class extends Error {
		constructor(lv, why) {
			super(`Access: Denied for < ${lv}` + (why ? `. ` + why : ""))
			this.code = "WillBot::AccessErr"
		}
	},
	explain: { "-1": "Prisoner", 0: "Stranger", 1: "Collaborator", 2: "Trustee", 3: "Handler", 4: "Willer" }
}

const fun = {
	">": {
		_: i => {1 // Run the [i]th lastest command.
			i = + i || 0

			const cmds = L.sto.log.cmds
			if (i < 0) return ">: Expected [idx] >= 0"
			if (i >= cmds.length) return `>: Expected [idx] < ${ cmds.length }`
			const raw = cmds[i]

			L.msg.reply(">: Running Ψ> " + raw)
			will(raw)
		},
		switch: () => {3, "s" // Toggle whether to record history commands.
			return ">: " + ((L.sto.log.on = ! L.sto.log.on) ? "on" : "off")
		},
		list: _ => {2, "l", "*" // List history command from [i] to [j].
			let [ i, j ] = _.split("..")
			i ||= 0
			j ||= + i
			j ++
			const d = j.toString().length
			return `>: Listing ${i}..${j}\n` + L.sto.log.cmds
				.slice(i, j)
				.map((s, k) => k + "." + " ".repeat(d - k.toString().length + 1) + s)
				.join("\n")
		},
		clear: () => {3, "c" // Clear all history commands.
			; (L.sto.log ??= {}).cmds = []
		},
	},
	"!": () => {3 // Reload the will
		L.reload()
		L.bot.logger.mark("WillBot: Reload the will.")
	},
	whoami: () => {0 // Who are you?
		return `${ L.msg.sender.nickname }(${ L.msg.user_id })`
	},
	with: {
		_: cmds => {0, "set", "%" // Set current withs.
			; (L.sto.with ??= {})[ L.msg.user_id ] = []
			return fun.with.add(cmds)
		},

		add: cmds => {0, "+" // Add command(s)(*) to withs.
			cmds = cmds.split(/\s*,\s*/)
			const bad_cmds = cmds.filter(c => ! whats_fun(c))
			if (bad_cmds.length)
				return `With: Command(*) [ ${ bad_cmds.join(", ") } ] not found`

			; ((L.sto.with ??= {})[ L.msg.user_id ] ??= []).push(...cmds)
		},

		rmv: cmds => {0, "-" // Remove command(s)(*) from withs.
			cmds = cmds.split(/\s*;\s*/)
			const withs = (L.sto.with ??= {})[ L.msg.user_id ] ??= []
			const bad_cmds = cmds.filter(c => ! withs.includes(c))
			if (bad_cmds.length)
				return `With: Command(*) [ ${ bad_cmds.join(", ") } ] not in withs`

			cmds.forEach(c => withs.splice(withs.findIndex(w => w === c), 1))
		},

		get: () => {0, "/" // Get current withs.
			const withs = L.sto.with?.[ L.msg.user_id ]
			return "With: " + (withs ? `[ ${ withs.join(", ") } ]` : "null")
		}
	},
	prompt: {
		get: () => {0, "/" // Get current prompts
			return `Prompt: [${ L.sto.prompts.map(p => `"${p}"`).join(", ") }]`
		},

		add: prompt => {4, "+" // Add a prompt.
			if (! prompt) return "Prompt: Prompt is empty"
			if (L.sto.prompts.includes(prompt)) return "Prompt: Prompt already exists"
			L.sto.prompts.push(prompt)
		},

		rmv: prompt => {4, "-" // Remove a prompt.
			const i = L.sto.prompts.indexOf(prompt)
			if (i < 0) return "Prompt: Prompt doesn't exist"
			L.sto.prompts.splice(i, 1)
		}
	},
	where: cmd => {1
		const find_fun = (f, cmd) => {
			if (typeof f !== "object") return
			if (cmd in f) return "." + cmd
			for (const [ n, g ] of Object.entries(f)) {
				if (f === g) continue
				const r = find_fun(g, cmd)
				if (r) return "." + n + r
			}
		}
		const r = find_fun(fun, cmd)
		return `Where: "${cmd}" is ` + (r ? `"${r}"` : "nope")
	},
	jobs: {
		_: () => {3 // Display status of jobs. id# <stat> [available signals] @ time: description
			return L.jobs
				.map(({ desc, time, sig, stat }, id) =>
					`${id}# ${ stat ? `<${stat}> ` : "" }[${ Object.keys(sig).join(", ") }] @ ${ new Date(time).toLocaleString() }: ${desc}`
				)
				.join("\n")
		},
		kill: _ => {4 // Sent a [signal] to a [job]. The default is "kill".
			let [ id, sig ] = _.trim().split(/\s+/)
			sig ||= "kill"
			if (! L.jobs[id]) return "Kill: Job doesn't exist."
			if (! L.jobs[id].sig?.[sig]) return `Kill: Signal "${sig}" isn't supported.`
			L.jobs[id].sig[sig]()
			return `Kill: Signal was sent.`
		}
	},
	wait: {
		_: _ => {3, "for" // Execute a [command] after a few [millisecond]s.
			const [ time, raw ] = _ instanceof Array ? _ : _.split(/(?<! .*) +/)
			const tid = setTimeout(async () => {
				try {
					await will(raw)
				}
				finally { rmv() }
			}, + time)
			const { rmv } = L.jobs.reg({
				desc: L.raw,
				sig: {
					kill: () => {
						clearTimeout(tid)
						rmv()
					}
				}
			})
		},
		until: _ => {3 // Execute a [command] until specific [moment].
			const [ time, raw ] = _.split(/(?<! .*) +/)
			return fun.wait.for([ new Date(time) - new Date(), raw ])
		}
	},
	access: {
		explain: lv => {0, // Explain specific [lv] or all.
			L.msg.reply(lv
				? access.explain[lv] ?? "Nuller"
				: Object.entries(access.explain)
					.map(([ lv, txt ]) => (" " + lv).slice(-2) + ": " + txt)
					.join("\n"))
		},

		get: (id, man) => {0, "/" // Get your or [id]'s lv.
			id ||= L.msg.user_id
			if (L.sto.access?.[id] === undefined)
				(L.sto.access ??= {})[id] = 0
			const lv = + L.sto.access[id]
			return man
				? `Access: ${id}'s lv === ${lv}: ${ access.explain[lv] }`
				: lv
		},

		set: (_, man) => {3, "%" // Set [id]'s lv to [lv]
			const [ id, lv ] = _ instanceof Array ? _ : _.split(/ +/).map(i => + i)
			if (! lv)
				return "Access: Needed target lv." + (man ? " Expected [id]=[lv]" : "")
			fun.access.req(
				Math.max(lv, (id === L.msg.user_id
					? - Infinity
					: (L.sto.access?.[id] ?? 0) + 1
				)),
				"Needed lv > the settee"
			)

			L.sto.access[id] = lv
			return man
				? `Access: ${id}'s lv = ${lv}: ${ access.explain[lv] }`
				: undefined
		},

		list: lv => {3, "l", "*" // List lvs of all users.
			return Object.entries(L.sto.access ?? {})
				.filter(a => ! lv || a[1] === + lv)
				.sort((a1, a2) => a2[1] - a1[1])
				.map(([ id, lv ]) => id + ".".repeat(15 - id.length) + lv)
				.join("\n")
		},

		req: (lv, why) => {-1 // Require [lv] for [why].
			if (! (fun.access.get(L.msg.user_id) >= + lv))
				throw new access.Error(lv, typeof why === "string" ? why : undefined)
		},

		sado: async _ => {0, "^" // Switch Access DO.
			const [ tlv, raw ] = _.split(/(?<! .*) +/)
			const id = L.msg.user_id
			const olv = fun.access.get()

			fun.access.set([ id, + tlv ])
			try {
				await will(raw ?? "")
			}
			finally {
				L.sto.access[id] = olv
			}
		},

		sudo: async _ => {4, "@" // Switch User DO.
			let [ uid, raw ] = _.split(/(?<! .*) +/)
			uid = + uid
			const old_uid = L.msg.user_id

			const sudoee = L.bot.gml.get(L.msg.group_id)?.get(uid)
			if (! sudoee) return "Access: Sudoee isn't in current group."
			L.msg.sender = sudoee

			fun.access.req((L.sto.access[uid] ?? 0) + 1, "Needed lv >= the sudoee")
			try {
				L.msg.user_id = uid
				await will(raw ?? "")
			}
			finally {
				L.msg.user_id = old_uid
			}
		}
	},
	test: "*",
	op: "*",
	dice: "*",
	saying: "*",
	project: "*",
	sifou: "*",
	minec: "*",
	property: "*"
}

init_fun({ fun })
fun[""] = fun

// :: Export

module.exports = will

