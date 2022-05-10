const escs = {
	n: '\n',
	r: '\r',
	t: '\t',
	a: '\u0007',
	e: '\u001B'
}

const white = /[ \t]/
const d8 = /[0-7]/
const d16 = /[\da-fA-F]/
const ident = /[a-zA-Z_]/
const identd = /[a-zA-Z_\d]/

export default (ln, vars) => {
	const f = {
		esc: false,
		cesc: false,
		sq: false,
		dq: false,
		var: false,
		wh: true,
	}
	const e = () => {
		now += String.fromCharCode(parseInt(enow, f.cesc === 'o' ? 8 : 16))
		f.cesc = false
		enow = ''
	}

	const tokens = []
	let now = '', enow = '', vnow = ''
	for (const ch of ln.trimStart() + '\0') {
		if (f.esc) {
			if (ch === 'x' || ch === 'u' || ch === '0') f.cesc = ch === '0' ? 'o' : ch
			else now += escs[ch] ?? ch
			f.esc = false
			continue
		}
		if (white.test(ch) && ! f.sq && ! f.dq) {
			if (f.wh) continue
			tokens.push(now)
			now = ''
			f.wh = true
			continue
		}
		else f.wh = false
		if (f.cesc) {
			if (enow.length < (f.cesc === 'u' ? 4 : 2)) {
				if ((f.cesc === 'o' ? d8 : d16).test(ch)) {
					enow += ch
					continue
				}
				else if (f.cesc === 'o') e()
				else {
					now += f.cesc + enow
					f.cesc = false
					continue
				}
			}
			else e()
		}
		else if (f.var) {
			if (! vnow.length && ! ident.test(ch) || vnow.length && ! identd.test(ch)) {
				now += vars[vnow] ?? ''
				f.var = false
				vnow = ''
			}
			else {
				vnow += ch
				continue
			}
		}
		if (ch === '\\') f.esc = true
		else if (ch === '\'' && ! f.dq) f.sq = ! f.sq
		else if (ch === '"' && ! f.sq) f.dq = ! f.dq
		// else if (! f.dq && ! f.sq && ch === '~') now += '/home'
		else if (! f.sq && ch === '$') f.var = true
		else now += ch
	}
	if (now) tokens.push(now.slice(0, -1))

	return [ tokens, f ]
}
