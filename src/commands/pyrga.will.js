import canvas			from 'canvas'
import relativeTime		from 'dayjs/plugin/relativeTime.js'
import dayjs			from 'dayjs'; dayjs.extend(relativeTime)
import { segment }		from 'oicq'

export default () => {
	const { games, players } = bot.chess ??= { games: {}, players: {} } 

	const checkPos = (r, c) => r >= 1 && r <= 4 && c >= 1 && c <= 4

	const PieceTypes = {
		circle: 0,
		square: 1,
		arrow: 2,
		arrow_up: 2,
		arrow_left: 3,
		arrow_down: 4,
		arrow_right: 5,
	}

	const ArrowDir = {
		[PieceTypes.arrow_up]:		[ -1, 0 ],
		[PieceTypes.arrow_left]:	[ 0, -1 ],
		[PieceTypes.arrow_down]:	[ +1, 0 ],
		[PieceTypes.arrow_right]:	[ 0, +1 ],
	}

	const PieceTypeStrs = [
		[ 'c', 'circle' ],
		[ 's', 'square' ],
		...[
			[ 'u', 'up' ],
			[ 'l', 'left' ],
			[ 'd', 'down' ],
			[ 'r', 'right' ]
		].map(dirs => dirs.map(d => [ 'a', 'arrow' ].map(t => t + d)).flat())
	]

	const PieceTypeNames = [
		'圆', '方', '上箭头', '左箭头', '下箭头', '右箭头'
	]

	const PieceTypeNamesWithoutDir = [
		'圆', '方', '箭头'
	]

	const posOfPieceInHand = (player, type, i) => [
		220 + 40 * player,
		10 + (type * 5 + i) * 13
	]

	const posOfPieceOnBoard = (row, col) => [
		10 + (col - 1) * 50 + 5,
		10 + (row - 1) * 50 + 5
	]

	const drawPiece = (type, ctx, size, x, y) => {
		ctx.beginPath()
		switch (type) {
		case PieceTypes.circle: {
			const r = size * 0.3
			const center = size / 2
			ctx.arc(x + center, y + center, r, 0, 2 * Math.PI)
			break
		}
		case PieceTypes.square:
			ctx.rect(x, y, size, size)
			break
		case PieceTypes.arrow_up:
			ctx.moveTo(x + size / 2, y + size)
			ctx.lineTo(x + size / 2, y)
			ctx.lineTo(x + size / 4, y + size / 4)
			ctx.moveTo(x + size / 2, y)
			ctx.lineTo(x + size * 3 / 4, y + size / 4)
			break
		case PieceTypes.arrow_left:
			ctx.moveTo(x + size, y + size / 2)
			ctx.lineTo(x, y + size / 2)
			ctx.lineTo(x + size / 4, y + size / 4)
			ctx.moveTo(x, y + size / 2)
			ctx.lineTo(x + size / 4, y + size * 3 / 4)
			break
		case PieceTypes.arrow_down:
			ctx.moveTo(x + size / 2, y)
			ctx.lineTo(x + size / 2, y + size)
			ctx.lineTo(x + size / 4, y + size * 3 / 4)
			ctx.moveTo(x + size / 2, y + size)
			ctx.lineTo(x + size * 3 / 4, y + size * 3 / 4)
			break
		case PieceTypes.arrow_right:
			ctx.moveTo(x, y + size / 2)
			ctx.lineTo(x + size, y + size / 2)
			ctx.lineTo(x + size * 3 / 4, y + size / 4)
			ctx.moveTo(x + size, y + size / 2)
			ctx.lineTo(x + size * 3 / 4, y + size * 3 / 4)
			break
		}
		ctx.stroke()
	}

	const calcTowers = (game) => {
		const towers = [ [], [] ]
		; [ 0, 1 ].forEach(
			player => game.board.forEach(
				(row, r) => (row.forEach(
					(block, c) => {
						if (block.reduce(
							(acc, owner) => acc + (owner === null ? -1 : owner === player), 0
						) >= 2) towers[player].push([ r, c ])
					})
				)
			)
		)
		return towers
	}

	const colors = [ '#f00', '#00f' ]
	const colorNames = [ '红方', '蓝方' ]

	const subs = {
		show: {
			args: [ { ty: 'str', name: 'name', opt: true }, { ty: '$uid' } ],
			help: '查看游戏 <name> 的棋盘，默认为当前游戏',
			fn: (name, uid) => {
				if (name === undefined) {
					name = players[uid]
					if (! name) return '您不在游戏中'
				}

				const game = games[name]
				if (! game) return `不存在游戏 ${name}`
				return segment.image(game.cvs.toBuffer('image/png'))
			},
			subs: {
				info: {
					args: [ { ty: 'str', name: 'name', opt: true }, { ty: '$uid' } ],
					help: '显示游戏 <name> 的详细信息，默认为当前游戏',
					fn: (name, uid) => {
						if (name === undefined) {
							name = players[uid]
							if (! name) return '您不在游戏中'
						}

						const game = games[name]
						return [
							subs.show.fn(name, uid),
							[ 0, 1 ].map(player => `${colorNames[player]}：${game.players[player] || '暂无'}`).join('\n') + '\n' +
							`游戏时长：${dayjs(game.startTime).fromNow(true)}\n` +
							`回合数：${game.round}`
						]
					}
				},
			}
		},
		list: {
			args: [],
			help: '查看所有游戏',
			fn: () => Object.keys(games).map(name => `${name}(${games[name].players.join(', ')})`).join('\n') || '还没有游戏'
		},
		start: {
			args: [ { ty: 'str', name: 'name' }, { ty: '$uid' } ],
			help: '开启一局命名为 <name> 的游戏',
			fn: (name, uid) => {
				if (games[name]) return `已经存在游戏 ${name}`
				if (players[uid]) return `您已经有正在进行的游戏 ${players[uid]}`
				if (name.length > 8) return '命名不能超过 8 个字符'
				
				const cvs = canvas.createCanvas(290, 220)
				const ctx = cvs.getContext('2d')

				games[players[uid] = name] = {
					players: [ uid ],
					startTime: new Date,
					cvs, ctx,
					round: 0,
					pieces: [0, 1].map(() => [ 5, 5, 5 ]),
					board: Array.from({ length: 4 },
						() => Array.from({ length: 4 },
							() => [ null, null, null ]
						)
					)
				}

				// Note: 白色背景

				ctx.fillStyle = '#fff'
				ctx.fillRect(0, 0, 290, 220)

				// Note: 棋盘
				ctx.strokeStyle = '#000'
				ctx.rect(10, 10, 200, 200)
				for (let i = 1; i <= 3; i ++) {
					ctx.moveTo(10 + 50 * i, 10)
					ctx.lineTo(10 + 50 * i, 210)
					ctx.moveTo(10, 10 + 50 * i)
					ctx.lineTo(210, 10 + 50 * i)
				}
				ctx.stroke()

				// Note: 手中棋子
				for (let player = 0; player < 2; player ++) {
					ctx.strokeStyle = colors[player]
					for (let type = 0; type < 3; type ++) {
						for (let i = 0; i < 5; i ++) {
							drawPiece(
								type, ctx, 10,
								...posOfPieceInHand(player, type, i)
							)
						}
					}
				}

				return [
					subs.show.fn(name),
					'游戏开始'
				]
			}
		},
		join: {
			args: [ { ty: 'str', name: 'name' }, { ty: '$uid' } ],
			help: '加入游戏 <name>',
			fn: (name, uid) => {
				if (players[uid]) return `您已经在游戏 ${players[uid]} 中`

				const game = games[name]
				if (! game) return `不存在游戏 ${name}`

				if (game.players.length === 2) return `游戏 ${name} 人数已满：${game.players.join(', ')}`
				
				players[uid] = name
				game.players[1] = uid
				return `已加入游戏 ${name}`
			}
		},
		leave: {
			args: [ { ty: '$uid' } ],
			help: '离开当前游戏，如有剩下的玩家，将成为发起者',
			fn: (uid) => {
				const name = players[uid]
				if (! name) return '您不在游戏中'
				
				let reply = `已退出游戏 ${name}`
				const game = games[name]
				if (game.players[0] === uid) {
					if (game.players[1]) {
						game.players[0] = game.players.pop()
						reply += `，${game.players[0]} 已成为发起者`
					}
					else {
						reply += '，游戏结束'
						delete games[name]
					}
				}
				else {
					game.players.pop()
				}
				delete players[uid]

				return reply
			}
		},
		end: {
			args: [ { ty: '$uid' } ],
			help: '结束您发起的游戏',
			fn: (uid) => {
				const name = players[uid]
				if (! name) return '您不在游戏中'

				const game = games[name]
				if (game.players[0] !== uid) return `您不是游戏 ${name} 的发起者`

				delete players[uid]
				let reply = `已结束游戏 ${name}`
				const u2id = game.players[1]
				if (u2id) {
					delete players[u2id]
					reply += `，已踢出玩家 ${u2id}`
				}
				delete games[name]

				return reply
			}
		},
		me: {
			args: [ { ty: '$uid' } ],
			help: '查看您的游戏信息',
			fn: (uid) => {
				const name = players[uid]
				if (! name) return '您不在游戏中'

				const game = games[name]
				const player = game.players.indexOf(uid)
				return `当前游戏：${name}，角色：${colorNames[player]}`
			}
		},
		tower: {
			args: [
				{ ty: 'str', name: 'name', opt: true },
				{ ty: '$uid' }
			],
			help: '显示当前塔数',
			fn: (name, uid) => {
				if (name === undefined) {
					name = players[uid]
					if (! name) return '您不在游戏中'
				}

				const game = games[name]
				const towers = calcTowers(game)

				const [ t0, t1 ] = towers.map(t => t.length)

				return `${colorNames[0]}和${colorNames[1]}有 ${t0} ${ t0 < t1 ? '<' : t0 > t1 ? '>' : '=' } ${t1} 座塔\n`
					+ towers.map(
						(t, player) => colorNames[player] + '：' + (t.map(([ r, c ]) => `(${r}, ${c})`).join('、') || '无')
					).join('\n')
			}
		},
		place: {
			args: [
				{ ty: 'num', name: 'row', int: true },
				{ ty: 'num', name: 'col', int: true },
				{ ty: 'str', name: 'chess-type' },
				{ ty: '$uid' }
			],
			help: '在 <row> 行 <col> 列落一个类型为 <chess-type> 的子\n'
				+ '<row>, <col>：应为 1 ~ 4 的整数\n'
				+ '<chess-type>：\n'
				+ 'c[ircle], s[quare], a[rrow]{l[eft],r[ight],u[p],d[own]}',
			fn: (row, col, type, uid) => {
				const name = players[uid]
				if (! name) return '您不在游戏中'

				let reply = ''

				const game = games[name]

				const player = game.players.indexOf(uid)
				if (game.lastPlace === player) return '对手还未落子'
				reply = `【${game.round + 1} 回合${colorNames[player]}】`

				if (row < 1 || row > 4) return '行号不合法'
				if (col < 1 || col > 4) return '列号不合法'

				type = PieceTypeStrs.findIndex(strs => strs.includes(type))
				if (type < 0) return '落子类型不合法'

				const typeWithoutDir = type > 1 ? 2 : type
				const typeName = PieceTypeNames[type]
				const typeNameWithoutDir = PieceTypeNamesWithoutDir[typeWithoutDir]

				if (game.pieces[player][typeWithoutDir] === 0) return `您没有【${typeNameWithoutDir}】了`

				const block = game.board[row - 1][col - 1]

				if (game.ltdPos) {
					if (! game.ltdPos.length) {
						if (block.find(x => typeof x === 'number'))
							return '对手上一子限定范围为空，必须在空白格落子'
					}
					else if (! game.ltdPos.find(([ r, c ]) => r === row && c === col))
						return '该位置不在对手上一子的限定范围内'
				}

				if (block[typeWithoutDir]) return `该位置已经有 【${typeNameWithoutDir}】了`
				
				// Note: 以上均为允许落子判定，不修改游戏数据

				game.round ++

				const pieceNum = -- game.pieces[player][typeWithoutDir]
				block[typeWithoutDir] = player

				if (game.lastPlace === undefined) {
					game.lastPlace = player
					reply += '您先手，'
				}
				else game.lastPlace ^= 1

				// Note: 计算限定
				switch (typeWithoutDir) {
				case PieceTypes.circle:
					game.ltdPos = [ [ row, col ] ]
					break
				case PieceTypes.square:
					game.ltdPos = [
						[ row - 1, col ], [ row, col - 1 ],
						[ row + 1, col ], [ row, col + 1 ],
					].filter(([ r, c ]) => checkPos(r, c))
					break
				case PieceTypes.arrow: {
					const dir = ArrowDir[type]
					let r = row, c = col
					game.ltdPos = []
					while (true) {
						r += dir[0]; c += dir[1]
						if (! checkPos(r, c)) break
						game.ltdPos.push([ r, c ])
					}
					break
				}
				}


				game.ltdPos = game.ltdPos.filter(([ r, c ]) =>
					game.board[r - 1][c - 1].some((x, t) =>
						x === null && game.pieces[player ^ 1][t] > 0
					)
				)

				// Note: 擦除手中棋子
				game.ctx.strokeStyle = '#fff'
				drawPiece(
					typeWithoutDir, game.ctx, 10,
					...posOfPieceInHand(player, typeWithoutDir, pieceNum)
				)

				// Note: 绘制棋子
				game.ctx.strokeStyle = colors[player]
				drawPiece(type, game.ctx, 40, ...posOfPieceOnBoard(row, col))

				reply += `您在 (${row}, ${col}) 落了一个【${typeName}】`

				// Note: 终局判定
				if (! game.ltdPos.length) {
					if (! game.board.some(
						(row) => row.some(
							(block) => block.find(
								(x, t) => typeof x === 'number' && game.pieces[player ^ 1][t] > 0
							)
						)
					)) {
						reply += '\n对手无子可落，游戏结束\n'
							+ subs.tower.fn(name, uid)
					}
				} 

				return [
					subs.show.fn(name),
					reply
				]
			}
		},
		// save: {
		// 	args: [ { ty: '$uid' } ],
		// 	help: '保存当前游戏进度到数据库',
		// 	fn: async (uid) => {
		// 		const name = players[uid]
		// 		if (! name) return '您不在游戏中'

		// 		const game = cloneJSON(games[name])
		// 		game._id = `${name}@${new Date().toJSON()}`

		// 		await bot.db.collection('pyrga').insertOne(game)

		// 		return `已保存为 ${game._id}`
		// 	}
		// }
	}

	return {
		help: 'Pyrga 棋，来源于 https://www.bilibili.com/video/BV1fa411e7ih',
		alias: [ 'chess' ],
		subs
	}
}
