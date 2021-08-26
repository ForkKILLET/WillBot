const cp			= require("child_process")
const os			= require("os")
const { format }	= require("pretty-format")

module.exports = L => {
	const me = {
		info: () => {0, "i" // Show bot information.
			return `
				WillBot v1.4.0 {
					author: "ForkKILLET",
					madeBy: "OICQ",
					runOn: "${os.type}",
					uin: ${L.bot.uin},
					githubRepo: "ForkKILLET/WillBot"
				}
			`.padIndent(4)
		},
		msg: () => {1, "m" // Show message object.
			L.msg.reply(format(L.msg), true)
		},
		eval: (code, man) => {4, "e", "~" // Evaluate javascript [code].
			try {
				/* eslint-disable-next-line */
				const I = L.msg.user_id

				const res = eval(code)
				return ! man || L.msg.sender.nickname === "WillBot::CLI"
					? res
					: format(res)
			}
			catch (err) {
				return err.toString()
			}
		},
		eval_async: async (code, man) => {4, "ea", "~a" // Await evaluate javascript [code].
			const res = await me.eval(code)
			return ! man || L.msg.sender.nickname === "WillBot::CLI"
				? res
				: format(res)
		},
		sh: async code => {4, "$" // Execute sh [code].
			return new Promise(res => {
				const child = cp.exec(code, { timeout: 30 * 1000 }, (err, stdout, stderr) => {
					let r = (err ? stderr : stdout).replace(/\x1B\[\d?;?\d{0,2}[a-z]/g, "")
					if (err) r += "\n\nSh: " + (err?.signal
						? `Received system signal: ${err.signal}`
						: `Got error: ${err.message}`
					)
					rmv()
					res(r)
				})

				const { rmv } = L.jobs.reg({
					desc: L.raw,
					sig: {
						kill: () => {
							child.kill()
							rmv()
							res("Sh: Received WillBot signal: kill.")
						}
					}
				})
			})
		},
		zsh: code => {4, "$z" // Execute zsh [code], sourcing ".zshrc".
			return me.sh(`
				zsh << WillBot::ZSH
				source ~/.zshrc > /dev/null
				${code}
				WillBot::ZSH
			`.padIndent(4))
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
		},
		julia: code => {4, "jl" // Run Julia [code].
			return me.sh(`
				julia <<WillBot::Julia
				${code}
				WillBot::Julia
			`.padIndent(4))
		},
		sto: {
			_: () => {3 // Get storage
				return format(L.sto)
			},
			read: async () => {4, "r", "/" // Read storage from config file.
				await L.sto.read()
				L.bot.logger.mark("WillBot: Read config.")
			},
			write: async () => {4, "w", "%" // Write storage to config file.
				await L.sto.write()
				L.bot.logger.mark("WillBot: Write config.")
			},
			auto: interval => {4 // Automatically write storage to config file every [interval] seconds.
				let on = true
				const tid = setInterval(() => {
					if (on) me.sto.write()
				}, (+ interval || 1) * 1000)

				const { rmv, stat } = L.jobs.reg({
					desc: L.raw,
					sig: {
						kill: () => {
							clearInterval(tid)
							rmv()
						},
						suspend: () => { on = false; stat("suspended") },
						resume: () => { on = true; stat() }
					}
				})
			}
		}
	}
	return me
}
