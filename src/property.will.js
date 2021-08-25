module.exports = (L, fun) => {
	const products = [

	]

	const me = {
		coin: {
			get: (id, man) => {0 // 瞅瞅你有几个硬币
				id ||= L.msg.user_id
				const coin = ((L.sto.property ??= {})[id] ??= {}).coin ??= {}
				coin.n ??= 0; coin.place ??= "兜里"
				return man
					? `${id} ${coin.place}有 ${coin.n} 个硬币`
					: coin
			},
			move: place => {0 // 给你的硬币搬家
				if (place.length > 10) return "啰啰嗦嗦，十个字说清楚能不能的"
				const coin = me.coin.get(), old_place = coin.place
				coin.place = place
				return `硬币从${old_place}搬到${place}了`
			},
			mod: (_, man) => {4 // 玩权限
				const [ id, n ] = _ instanceof Array ? _ : _.split(/ +/).map(i => + i)
				const coin = me.coin.get()
				coin.n += n
				if (man) return `${id} ${ n >= 0 ? "增加" : "减少" }了${ Math.abs(n) }个硬币`
			},
			bet: async () => {0 // 从骰子女神那骗钱
				const id = L.msg.user_id
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
					me.coin.mod([ id, n ])
					return `这一秒，时间的骰子在 ${t} 被捕获，人品的骰子在 ${p} 落定，某一秒的骰子仍显示 ${m}。`
						+ `你因而获得了 ${t} * ${p} % ${m} === ${n} 个硬币，作为胜利者的筹码`
				}
			}
		},
		shop: {
			list: () => {0
				return products
			}
		}
	}
	return me
}
