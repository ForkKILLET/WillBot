module.exports = (L, fun) => {
	const products = [
		{ id: "seashell", name: "贝壳", quantifier: "只", price: 3 }
	]
	const desc = (n, { quantifier, name }) => n + " " + quantifier + name

	const me = {
		coin: {
			get: (u, man) => {0, "g", "/" // 瞅瞅你有几个硬币
				u ||= L.msg.user_id
				const coin = ((L.sto.property ??= {})[u] ??= {}).coin ??= {}
				coin.n ??= 0; coin.place ??= "兜里"
				return man
					? `${u} ${coin.place}有 ${coin.n} 个硬币`
					: coin
			},
			move: place => {0, "->" // 给你的硬币搬家
				if (! place.trim()) return "白茫茫一片真干净，是吧？"
				if (place.length > 10) return "啰啰嗦嗦，十个字说清楚能不能的"
				const coin = me.coin.get(), old_place = coin.place
				coin.place = place
				return `硬币从${old_place}搬到${place}了`
			},
			mod: (_, man) => {4, "%" // 玩权限改钱
				const [ u, n ] = _ instanceof Array ? _ : _.split(/ +/).map(i => + i)
				const coin = me.coin.get(u)
				coin.n += n
				if (man) return `${u} ${ n >= 0 ? "增加" : "减少" }了${ Math.abs(n) }个硬币`
			},
			bet: async () => {0 // 从骰子女神那骗钱
				const u = L.msg.user_id
				const { rp } = fun.dice.jrrp._(null)

				if (Date.isSameDay(new Date(rp.t), new Date))
					return rp?.cleared
						? "出千是会被砍手的哦"
						: "今天没有机会了呢"
				else if (! (rp.bet ??= {}).t || ! Date.isSameDay(rp.bet.t, new Date)) {
					rp.bet.t = new Date
					return `这一秒，骰子女神受到了 ${ rp.bet.m = Math.randin(5, 15) } 次膜拜`
				}
				else {
					const
						t = new Date().getSeconds() % 10,
						{ p } = fun.dice.jrrp._(),
						m = rp.bet.m, n = t * p % m
					me.coin.mod([ u, n ])
					return `这一秒，时间的骰子在 ${t} 被捕获，人品的骰子在 ${p} 落定，某一秒的骰子仍显示 ${m}。`
						+ `你因而获得了 ${t} * ${p} % ${m} === ${n} 个硬币，作为胜利者的筹码`
				}
			}
		},
		junk: {
			get: (u, man) => {0 // 瞅瞅你有啥破烂
				u ||= L.msg.user_id
				const junks = ((L.sto.property ??= {})[u] ??= {}).junk ??= [], n = junks.length
				return man
					? `${u} ` + (n
						? `有 ${n} 种破烂：${ junks.map(junk => desc(junk.n, junk)).join("，") }`
						: "没得破烂"
					)
					: junks
			},
			mod: (_, man) => {4 // 玩权限改破烂
				const [ u, i, n ] = _ instanceof Array ? _ : _.split(/ +/).map(i => + i)
				const junks = me.junk.get(u)

				console.log(junks)

				let junk = junks.find(({ id }) => id === i?.id ?? i)

				console.log(junk)

				if (! junk)
					if (typeof i === "number") return "没这破烂"
					else junks.push(junk = i)
				junk.n ??= 0; junk.n += n

				return man
					? `${u} ${ n >= 0 ? "增加" : "减少" }了${ desc(Math.abs(n), junk) }`
					: junk.n
			}
		},
		shop: {
			list: () => {0, "l", "*" // 瞅瞅店里卖些啥破烂
				return products.map((product, i) => (
					`${i}. ${product.id}: ${ desc("每", product) } ${ product.price } 个硬币`
				)).join("\n")
			},
			buy: _ => {0, "b" // 买几个破烂，或者倾家荡产买破烂
				let [ i, n ] = _.split(/(?<! .*) +/)
				const product = products.find(({ id }, j) => id === i || j === + i)
				if (! product) return "商品不存在，请用序号或 ID 搜索"

				const coin = me.coin.get()
				const max_n = ~~ (coin.n / product.price)
				n = n ? + n : max_n
				const cost = n * product.price
				if (n > max_n) return `你没那么多钱。还差 ${ cost - coin.n } 个硬币`

				me.coin.mod([ null, - cost ])
				me.junk.mod([ null, product, n ])

				return `你花 ${cost} 个硬币买了 ${ desc(n, product) }`
			}
		}
	}
	return me
}
