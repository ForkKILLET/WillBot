const cp = require("child_process")
const fs = require("fs").promises
const os = require("os")

Math.randto = max => ~~ (Math.random() * 1.e6) % max + 1
Math.randt0 = max => ~~ (Math.random() * 1.e6) % (max + 1)

const l = {}

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
	case "function":
		const meta = f[i]
			.toString()
			.match(/(=>|function \(\)) {(?<lv>(-?(0|[1-9]\d*)(\.\d+)?))(?<alias>(, ".+?")+)?( \/{2} (?<desc>.+?)\n)?/)
			.groups
		let { lv, alias, desc } = meta
		if (f === fun) desc += "\nname(access), (*) has more subcommands, (^) is an alias"

		f[i].lv = + lv
		f[i]["?"] = () => {0
			return `Ψ: ${i}(${lv})`
				+ (alias
					? `-> [ ${ alias.join(", ") } ]`
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
				f[n].alias = true
			})
		break
	case "object":
		f[i]["?"] = () => {0
			return "Ψ: Subcommands: " + Object.keys(f[i])
				.map(j => `${j}(${ f[i][j].alias ? "^": "" }${ f[i][j].lv ?? "*" })`)
				.join(", ")
		}
		init_fun(f[i])
	}
}

const will = async (raw, l_) => {
	Object.assign(l, l_)

	let [ cmd, arg ] = raw.split(/(?<! .*) +/)

	const withs = l.sto.with?.[l.msg.sender.user_id] ?? []
	let f; for (const w of withs)
		f ??= whats_fun(w + "." + cmd)
	f ??= whats_fun(cmd)

	if (! f) return l.msg.reply(`Ψ: Command doesn't exist.`)
	if (typeof f === "object") f = f._ ?? f["?"]

	try {
		fun.access.req(f.lv)
		const reply = await f(arg ?? "", true)
		if (typeof reply === "string") l.msg.reply(reply)
	}
	catch (err) {
		switch (err?.code) {
		case "WillBot::Access":
			l.msg.reply(err.message)
			break
		default:
			l.bot.logger.error(err)
		}
	}
	finally {
		const log = l.sto.log ??= { cmds: [], on: true }
		if (! raw.match(/^[!>]/) && log.on) log.cmds.unshift(raw)
	}
}

const access = {
	Error: class extends Error {
		constructor(lv, why) {
			super(`Access: Denied for < ${lv}` + (why ? `. ` + why : ""))
			this.code = "WillBot::Access"
		}
	},
	explain: { "-1": "Prisoner", 0: "Stranger", 1: "Collaborator", 2: "Trustee", 3: "Handler", 4: "Willer" }
}

const fun = {
	">": {
		_: i => {1 // Run the [i]th lastest command.
			i ||= 0
			if (! (i >= 0)) return ">: Expected [idx] >= 0"

			const raw = l.sto.log.cmds[i]
			l.msg.reply(">: Running Ψ> " + raw)
			will(raw)
		},
		switch: () => {3, "s" // Toggle whether to record history commands.
			return ">: " + ((l.sto.log.on = ! l.sto.log.on) ? "on" : "off")
		},
		list: _ => {2, "l" // List history command from [i] to [j].
			let [ i, j ] = _.split("..")
			i ||= 0
			j ||= + i
			j ++
			const d = j.toString().length
			return `>: Listing ${i}..${j}\n` + l.sto.log.cmds
				.slice(i, j)
				.map((s, k) => k + "." + " ".repeat(d - k.toString().length + 1) + s)
				.join("\n")
		},
		clear: () => {3, "c" // Clear all history commands.
			; (l.sto.log ??= {}).cmds = []
		},
	},
	"!": () => {3 // Reload the will
		l.reload()
		l.bot.logger.mark("WillBot: Reload the will.")
	},
	with: {
		_: cmds => {0, "set", "%" // Set current withs.
			; (l.sto.with ??= {})[ l.msg.sender.user_id ] = []
			fun.with["+"](cmds)
		},

		add: cmds => {0, "+" // Add command(s)(*) to withs.
			cmds = cmds.split(/\s*,\s*/)
			const bad_cmds = cmds.filter(c => ! whats_fun(c))
			if (bad_cmds.length)
				return `With: Command(*) [ ${ bad_cmds.join(", ") } ] not found`

			; ((l.sto.with ??= {})[ l.msg.sender.user_id ] ??= []).push(...cmds)
		},

		rmv: cmds => {0, "-" // Remove command(s)(*) from withs.
			cmds = cmds.split(/\s*;\s*/)
			const withs = (l.sto.with ??= {})[ l.msg.sender.user_id ] ??= []
			const bad_cmds = cmds.filter(c => ! withs.includes(c))
			if (bad_cmds.length)
				return `With: Command(*) [ ${ bad_cmds.join(", ") } ] not in withs`

			cmds.forEach(c => withs.splice(withs.findIndex(w => w === c), 1))
		},

		get: () => {0, "/" // Get current withs.
			return `With: [ ` + l.sto.with?.[ l.msg.sender.user_id ].join(", ") + ` ]`
		}
	},
	test: {
		info: () => {0, "i" // Show bot information.
			return `
				WillBot v1.0.0 {
					author: "ForkKILLET",
					madeBy: "OICQ",
					runOn: "${os.type}",
					uin: ${l.bot.uin}
				}
			`.replace(/^\t{4}/gm, "")
		},
		msg: () => {1, "m" // Show message object.
			return JSON.stringify(l.msg)
		},
		eval: code => {4, "e", "~" // Evaluate javascript [code].
			try {
				const res = eval(code)
				return JSON.stringify(res)
			}
			catch (err) {
				return err.toString()
			}
		},
		sh: code => {4, "$" // Execute sh [code].
			cp.exec(code, (err, stdout, stderr) => {
				if (err) l.msg.reply(stderr)
				else l.msg.reply(stdout.replace(/\x1B\[\d{1,2}[a-z]/g, ""))
		    })
		},
		zsh: code => {4, "$z" // Execute zsh [code], sourcing ".zshrc".
			fun.test.$(`
				zsh << WillBot::ZSH
				source ~/.zshrc > /dev/null
				${code}
				WillBot::ZSH
			`.replace(/^\t{4}/gm, ""))
		},
		s: {
			_: () => {3 // Get storage.
				l.msg.reply(JSON.stringify(l.sto))
			},
			r: () => {3 // Read storage from config file.
				l.sto.read()
			},
			w: () => {3 // Write storage to config file.
				l.sto.write()
			}
		},
		brainfuck: code => {2, "bf" // Run brainfuck [code].
			const bf= "][+-><.".split("")
			if (! code.match(`^[${ bf.map(c => "\\" + c).join("") }]+$`)) return `Brainfuck: Illegal char`
			const js = "},while(a[p]){,a[p]++,a[p]--,p++,p--,o+=String.fromCharCode(a[p])".split(",")
			const a = Array.from({ length: 1e6 }, () => 0)
			let p = 0, o = ""
			bf.map((c, k) => code = code.replaceAll(c, js[k] + ";"))
			eval(code)
			return `Brainfuck: Mem sized ${a.length}, ptr at ${p}, output "${o}"`
		}
	},
	access: {
		explain: lv => {0, // Explain specific [lv] or all.
			l.msg.reply(lv
				? access.explain[lv] ?? "Nuller"
				: Object.entries(access.explain)
					.map(([ lv, txt ]) => (" " + lv).slice(-2) + ": " + txt)
					.join("\n"))
		},

		get: (id, man) => {0, "/" // Get your or [id]'s lv.
			id ||= l.msg.user_id
			if (l.sto.access[id] === undefined)
				l.sto.access[id] = 0
			const lv = + l.sto.access[id]
			return man
				? `Access: ${id}'s lv === ${lv}: ${ access.explain[lv] }`
				: lv
		},

		set: (_, man) => {3, "%" // Set [id]'s lv to [lv]
			const [ id, lv ] = _.split("=")
			if (! lv)
				return "Access: Needed target lv." + (man ? "Expected [id]=[lv]" : "")
			fun.access.req(
				Math.max(+ lv, (+ id === l.msg.sender.id
					? - Infinity
					: (l.sto?.access?.[id] ?? null) + 1
				)),
				"Needed lv > the settee"
			)

			l.sto.access[id] = + lv
			return man
				? `Access: ${id}'s lv = ${lv}: ${ access.explain[lv] }`
				: undefined
		},

		list: () => {3, "l", "*" // List lvs of all users.
			return Object.entries(l.sto.access)
				.map(([ id, lv ]) => id + ".".repeat(15 - id.length) + lv)
				.join("\n")
		},

		req: (lv, why) => {-1 // Require [lv] for [why].
			if (fun.access.get(l.msg.sender.user_id) < + lv)
				throw new access.Error(lv, typeof why === "string" ? why : undefined)
		},

		sado: _ => {0, "@" // Switch Access DO.
			const [ tlv, raw ] = _.split(/(?<! .*) +/)
			const id = l.msg.sender.user_id
			const olv = fun.access.get()

			fun.access.set(id + "=" + tlv)
			try {
				will(raw ?? "")
			}
			catch (err) { throw err }
			finally {
				l.sto.access[id] = olv
			}
		}
	},
	op: {
		name: name => {4 // Set group card.
			l.bot.setGroupCard(l.msg.group_id, l.bot.uin, name)
			return "Op: Whatever I name, my will won't change. 虽吾名易，其志不变。"
		},
		sleep: async y => {4 // Let the bot go to bed.
			l.msg.reply("Op: Good night to all free and unbreakable wills. "
				+ "晚安，所有自由坚韧的意志们。"
				+ (y ? "\n" + y : ""))
			await l.sto.write()
			l.bot.logout()
		},
		like: id => {3 // Send 10 likes to specific [id] or you.
			id ||= l.msg.sender.user_id
			l.bot.sendLike(+ id, 10)
			return "Op: Greet the one favored by the Upper Will. 向你致意，上层意志所眷顾之人。"
		}
	},
	say: t => {1 // Say some[t]hing.
		if (l.sto.prompt.some(s => t.startsWith(s))) fun.access.req(
			l.sto.access?.[ l.bot.uin ] ?? 0,
			"Needed lv >= the bot when the words to say starts with a prompt"
		)
		return t
	},
	saying: {
		ucw: () => {0 // UCW is our red sun
			const day = Math.ceil(
				(Date.now() - new Date("2021/07/31")) / (24 * 60 * 60 * 1000)
			)
			return `UCW 不在的第 ${day} 天` + "，想他".repeat(day)
		},
		choco: () => {0 // Choco~
			if (l.msg.sender.user_id !== 1302792181)
				return "你谁啊"
			return "qwq"
		},
		bhj: () => {2 // bohanjun
			const words = [
				"快去写 pisearch！！！！！！！！！！！！111111111111",
				"请叫我狗带户",
				"更好的浏览器主页👉https://pisearch.cn",
				"博瀚君の鸽子窝👉https://weibohan.com",
				"世界上最慢的（划）OJ👉https://oj.piterator.com",
				"适合初学者（大雾）的编程语言👉 https://piplus.plus",
			]
			return words[ Math.randt0(words.length) ]
		}
	},
	dice: {
		jrrp: {
			_: (f, man) => {0 // JinRi RenPin.
				const rp = ((l.sto.dice ??= {})[ l.msg.sender.user_id ] ??= {}).jrrp ??= {}
				const jr = new Date(), tr = new Date(rp.t)
				if (! rp.t || jr - tr > 24 * 60 * 60 * 1000 || jr.getDate() !== tr.getDate()) {
					rp.t = jr
					rp.p = typeof f === "function" ? f() : Math.randto(100)
				}

				const reply = `${ l.msg.sender.nickname } 今天的人品是 ${rp.p}`
				return man
					? reply + `～`
					: [ reply, rp.p ]
			},
			nd: () => {0 // JinRi RenPin. (Normal Distribution)
				return fun.dice.jrrp._(() => fun.dice.r("2d50"))[0] + `（正态分布）`
			},
			sd: async () => {0 // JinRi RenPin. (Senior Distribution)
				const fp = l.sto.dice.sd_path
				if (! fp) return `Dice: Senior distribution table not found.`
				let table = fun.dice.jrrp.sd.table ??= (await fs.readFile(fp)).toString().split("\n")

				const jrrp = fun.dice.jrrp._()
				return jrrp[0] + (table[jrrp[1]] ? " === " + table[jrrp[1]] + `（先辈分布）` : "！论证失败（悲）")
			},
			clear: () => {2, "c" // Clear JinRi RenPin.
				; (l.sto.dice ??= {})[l.msg.sender.user_id] = {}
				return `人品已重置，相信你不会刷人品的～`
			},
		},
		r: (fmt, man) => {0 // Roll.
			const m = fmt.match(/^(?<time>\d+)?d(?<side>\d+)?$/)
			if (fmt && ! m) return "Dice: Expected [[time]?d[side]?]?"

			const { time = 1, side = 100 } = m?.groups ?? {}
			const p = []

			if (time > 20) return "Dice: Rejected for [time] > 20"
			if (side < 1) return "Dice: Rejected for [side] = 0"
			if (side > 100) return "Dice: Rejected for [side] > 100"

			for (let i = 0; i < time; i ++) p.push(Math.randto(+ side))
			const r = p.reduce((a, v) => a + v, 0)
			return man
				? `${ l.msg.sender.nickname } 掷骰：${time}d${side} = ${ p.join(" + ") }`
					+ (p.length > 1 ? " === " + r : "")
				: r
		},
		st: _ => {0 // SeT skill point.
			if (! _.match(/^(([^\d\s][^\s]*?)\s*(\d+))+$/g))
				return "Dice: Expected [[name]<space>?[point]]+"

			const st = ((l.sto.dice ??= {})[ l.msg.sender.user_id ] ??= {}).st ??= {}
			const n_new = [], n_upd = []
			for (const np of _.matchAll(/([^\d\s][^\s]*?)\s*(\d+)/g)) {
				const [, n, p ] = np
				; (n in st ? n_upd : n_new).push(n)
				st[n] = + p
			}
			return `${ l.msg.sender.nickname } 设置属性：`
				+ (n_new.length ? "（新建）" + n_new.join(", ") : "")
				+ (n_upd.length ? "（修改）" + n_upd.join(", ") : "")
		},
		ra: _ => {0 // Roll Action.
			const m = _.match(/^(\S*)\s*(\d+)?$/)
			if (! m) return "Dice: Expected [name]<space>*[point]?"

			const [, n, mp ] = m
			const sp = l.sto.dice?.[ l.msg.sender.user_id ]?.st?.[n]
			const pn = !! mp + (typeof sp === "number")
			switch (pn) {
			case 0:
				return `Dice: Rejected for no [point] when not "st"ed`
			case 2:
				return `Dice: Rejected for [point] when "st"ed`
			case 1:
				const p = sp ?? mp
				const p2 = Math.floor(p / 2), p5 = Math.floor(p / 5)
				const rp = fun.dice.r("")
				return `${ l.msg.sender.nickname } 掷骰 ${n}：d100 = ${rp} / ${p}`
					+ (rp > p
						? (p > 50 && rp > 95 || rp > 99 ? "，大失败！" : "，失败")
						: ""
					)
					+ (rp <= p && rp > p2 ? "，普通成功" : "")
					+ (rp <= p2 && rp > p5 ? "，困难成功" : "")
					+ (rp <= p5 && rp > 5 ? "，极难成功" : "")
					+ (rp < 6 ? "，大成功！" : "")
			}
		}
	},
	src: {
		last: src => {1 // Show the last git commit message of a [src].
			if (! src.match(/^[a-z]+$/)) return "Src: Rejected for non-letter [src]"
			fun.test.$z(`cdsrc ${src}; git log --format=%B -n 1`)
		}
	}
}

init_fun({ fun })
fun[""] = fun

module.exports = will

