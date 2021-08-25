Math.randto = max => ~~ (Math.random() * 1.e6) % max + 1
Math.randt0 = max => ~~ (Math.random() * 1.e6) % (max + 1)
Math.randin = (min, max) => ~~ (Math.random() * 1.e6) % (max - min + 1) + min

String.prototype.padIndent = function (n) {
	return this.replace(RegExp(String.raw`^\t{${n}}`, "gm"), "")
}
String.padDiff = (i1, i2) => " ".repeat(i1.toString().length - i2.toString().length)

Date.sleep = t => new Promise(res => setTimeout(res, t))
Date.isSameDay = (d1, d2) => {
	return + d1 - d2 <= 24 * 60 * 60 * 1000 && d1.getDate() === d2.getDate()
}

Function.prototype.clone = function () {
    const that = this
    const f = function () {
		return that.apply(this, arguments)
	}
    for (const k in this) if (k in this) f[k] = this[k]
    return f
}

