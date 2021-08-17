// :: Import

const cp = require("child_process")
const os = require("os")
const mm = require("minimist")
const { format } = require("pretty-format")

// :: Util

Math.randto = max => ~~ (Math.random() * 1.e6) % max + 1
Math.randt0 = max => ~~ (Math.random() * 1.e6) % (max + 1)

String.prototype.padIndent = function (n) {
	return this.replace(RegExp(String.raw`^\t{${n}}`, "gm"), "")
}
String.padDiff = (i1, i2) => " ".repeat(i1.toString().length - i2.toString().length)

Date.isSameDay = (d1, d2) => {
	return + d1 - d2 <= 24 * 60 * 60 * 1000 && d1.getDate() === d2.getDate()
}

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
				h += "\n\nname(access), (*) has more subcommands, (^) is an alias"
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
		f[i]["?"] = () => {0
			return `Ψ: ${i}(${lv})`
				+ (alias
					? ` -> [ ${ alias.join(", ") } ]`
					: ""
				)
				+ `: ${desc}`
		}
		; (alias = alias
			?.split(", ")
			?.filter(n => n)
			?.map(n => n.slice(1, -1)))
			?.forEach?.(n => {
				f[n] = eval(f[i].toString())
				f[n]["?"] = () => {0
					return `Ψ: ${n}(${lv}) <- ${i}: ${desc}`
				}
				f[n].lv = + lv
				f[n].param = f[i].param
				f[n].alias = true
			})
		break
	}
}

const will = async (raw, L_) => {
	Object.assign(L, L_)

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
			const ps = mm(arg.split(/\s+/))
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
		if (reply) L.msg.reply(reply)
	}
	catch (err) {
		switch (err?.code) {
		case "WillBot::AccessErr":
		case "WillBot::ArgTypeErr":
			L.msg.reply(err.message)
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
			i ||= 0
			if (! (i >= 0)) return ">: Expected [idx] >= 0"

			const raw = L.sto.log.cmds[i]
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
	with: {
		_: cmds => {0, "set", "%" // Set current withs.
			; (L.sto.with ??= {})[ L.msg.user_id ] = []
			fun.with.add(cmds)
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
	where: cmd => {1
		const find_fun = (f, cmd) => {
			if (typeof f !== "object") return
			if (cmd in f) return "." + cmd
			for (const [ n, g ] of Object.entries(f)) {
				const r = find_fun(g, cmd)
				if (r) return "." + n + r
			}
		}
		return `Where: "${cmd}" is "${ find_fun(fun, cmd) ?? "nope" }"`
	},
	test: {
		info: () => {0, "i" // Show bot information.
			return `
				WillBot v1.3.0 {
					author: "ForkKILLET",
					madeBy: "OICQ",
					runOn: "${os.type}",
					uin: ${L.bot.uin},
					githubRepo: "ForkKILLET/WillBot"
				}
			`.padIndent(4)
		},
		msg: () => {1, "m" // Show message object.
			return format(L.msg)
		},
		eval: code => {4, "e", "~" // Evaluate javascript [code].
			try {
				const res = eval(code)
				return L.msg.sender.nickname === "WillBot::CLI"
					? res
					: format(res)
			}
			catch (err) {
				return err.toString()
			}
		},
		sh: async code => {4, "$" // Execute sh [code].
			return new Promise(res =>
				cp.exec(code, { timeout: 30 * 1000 }, (err, stdout, stderr) =>
					res((err ? stderr || (err?.signal ?? err) : stdout).replace(/\x1B\[\d?;?\d{0,2}[a-z]/g, ""))
				)
			)
		},
		zsh: async code => {4, "$z" // Execute zsh [code], sourcing ".zshrc".
			return await fun.test.sh(`
				zsh << WillBot::ZSH
				source ~/.zshrc > /dev/null
				${code}
				WillBot::ZSH
			`.replace(/^\t{4}/gm, ""))
		},
		s: {
			_: () => {3 // Get storage.
				L.msg.reply(JSON.stringify(L.sto))
			},
			r: () => {3 // Read storage from config file.
				L.sto.read()
				L.bot.logger.mark("WillBot: Read config.")
			},
			w: () => {3 // Write storage to config file.
				L.sto.write()
				L.bot.logger.mark("WillBot: Write config.")
			}
		},
		brainfuck: code => {2, "bf" // Run brainfuck [code].
			const bf= "][+-><.".split("")
			if (! code.match(`^[${ bf.map(c => "\\" + c).join("") }]+$`)) return `Brainfuck: Illegal char`
			const js = "},while(a[p]){,a[p]++,a[p]--,p++,p--,o+=String.fromCharCode(a[p])".split(",")
			const a = Array.from({ length: 1e6 }, () => 0)
			let p = 0, o = ""
			bf.map((c, k) => code = code.replaceAll(c, js[k] + ";"))
			try {
				eval(code)
			}
			catch (err) {
				return err
			}
			return `Brainfuck: Mem sized ${a.length}, ptr at ${p}, output "${o}"`
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
			if (L.sto.access[id] === undefined)
				L.sto.access[id] = 0
			const lv = + L.sto.access[id]
			return man
				? `Access: ${id}'s lv === ${lv}: ${ access.explain[lv] }`
				: lv
		},

		set: (_, man) => {3, "%" // Set [id]'s lv to [lv]
			const [ id, lv ] = _.split("=")
			if (! lv)
				return "Access: Needed target lv." + (man ? " Expected [id]=[lv]" : "")
			fun.access.req(
				Math.max(+ lv, (+ id === L.msg.user_id
					? - Infinity
					: (L.sto?.access?.[id] ?? null) + 1
				)),
				"Needed lv > the settee"
			)

			L.sto.access[id] = + lv
			return man
				? `Access: ${id}'s lv = ${lv}: ${ access.explain[lv] }`
				: undefined
		},

		list: lv => {3, "l", "*" // List lvs of all users.
			return Object.entries(L.sto.access)
				.filter(a => ! lv || a[1] === + lv)
				.sort((a1, a2) => a2[1] - a1[1])
				.map(([ id, lv ]) => id + ".".repeat(15 - id.length) + lv)
				.join("\n")
		},

		req: (lv, why) => {-1 // Require [lv] for [why].
			if (fun.access.get(L.msg.user_id) < + lv)
				throw new access.Error(lv, typeof why === "string" ? why : undefined)
		},

		sado: _ => {0, "@" // Switch Access DO.
			const [ tlv, raw ] = _.split(/(?<! .*) +/)
			const id = L.msg.user_id
			const olv = fun.access.get()

			fun.access.set(id + "=" + tlv)
			try {
				will(raw ?? "")
			}
			catch (err) { throw err }
			finally {
				L.sto.access[id] = olv
			}
		}
	},
	say: t => {1 // Say some[t]hing.
		if (L.sto.prompt.some(s => t.startsWith(s))) fun.access.req(
			L.sto.access?.[ L.bot.uin ] ?? 0,
			"Needed lv >= the bot when the words to say starts with a prompt"
		)
		return t
	},
	project: "*",
	op: "*",
	saying: "*",
	dice: "*",
	sifou: "*",
	minec: "*"
}

init_fun({ fun })
fun[""] = fun

// :: Export

module.exports = will

