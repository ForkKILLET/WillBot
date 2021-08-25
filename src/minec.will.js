module.exports = (L, fun) => ({
	info: () => {0
		return `
			WillBot::Minec v1.0.0 {
				MineCraftPlugin: {
					author: "optimize_2",
					madeBy: "Java",
					connect: "java.net.ServerSocket",
					githubRepo: "optimize-2/WillMC"
				},
				will: {
					author: "ForkKILLET",
					madeBy: "OICQ",
					connect: "net.Socket"
				},
				stable: false
			}
		`.padIndent(3)
	},
	forward: ([ host, port, group ] = [ "!=s", "!u", "!u" ]) => {4, "fw" // Two-way forward messages between MineCraft Server and QQ group.
		const net = require("net")
		const cfg = L.sto.minec?.forward ?? {}

		return new Promise(async (res, rej) => {
			const cl = new net.Socket()

			const sleep = () => cl.end(() => {
				rmv()
				res()
			})
			cl.on("error", err => {
				rmv()
				rej(err)
			})
			const { rmv } = L.jobs.reg({
				desc: L.raw,
				sig: {
					kill: sleep,
					pause: () => cl.pause()
				}
			})

			await new Promise(res => cl.connect({ host, port }, res))
			console.log("Connected")

			const write = t => new Promise(((res, rej) =>
				cl.write(t, err => err && rej(err) || res())
			))
			const writeln = async t => await write(t + "\n")

			cl.on("data", (buf) => {
				const txt = buf.toString("utf8")
				const [ name, raw ] = txt.split(/(?<!:.*):/)
				if (cfg.mc2qq)
					L.bot.sendGroupMsg(group, (cfg.before ? `Minec: ` : "") + `${name}: ${raw}`)

				const pr = L.sto.prompt.find(s => raw.startsWith(s))
				if (cfg.cmd && pr) L.wake("access.sado 2 " + raw.slice(pr.length).trim(), {
					msg: {
						reply: async t => writeln("willbot:" + t),
						group_id: group,
						user_id: 673163227,
						sender: {
							user_id: null,
							nickname: "WillBot::MC",
							card: `WillBot::MC::${group}`
						}
					},
					sleep
				})
			})

			L.bot.on("message", async msg => {
				if (cfg.qq2mc && msg.group_id === group) {
					await writeln(msg.sender.card + ":" + msg.raw_message)
				}
			})
		})
	},
	forward_default: () => {4, "fwd" // Forward with config.
		const { host, port, group } = L.sto.minec?.forward ?? {}
		fun.minec.forward([ host, port, group ])
		return `Minec: Running Ψ> minec.forward --host ${host} --port ${port} --group ${group}`
	},
	forward_config: ([ qq2mc, mc2qq, cmd, before, host, port, group ] = [ "b", "b", "b", "b", "s", "u", "u" ]) => {3, "fwc" // Config forwarding.
		Object.entries({ qq2mc, mc2qq, cmd, host, port, group, before })
			.forEach(([ k, v ]) => {
				if (v === undefined) return
				; ((L.sto.minec ??= {}).forward ??= {})[k] = v
			})
	}
})

