module.exports = L => ({
	ucw: () => {0 // UCW is our red sun
		const day = Math.ceil(
			(Date.now() - new Date("2021/07/31")) / (24 * 60 * 60 * 1000)
		)
		return false
			? `UCW 不在的第 ${day} 天` + "，想他".repeat(day)
			: "UCW is our red sun 🌞🌞🌞"
	},
	choco: () => {0 // Choco~
		if (L.msg.user_id !== 1302792181)
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
})
