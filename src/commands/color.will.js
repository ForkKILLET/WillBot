import canvas from 'canvas'
import dedent from 'dedent'
import { segment } from 'oicq'

export default ({ command: { runCmd, CmdError } }) => ({
	help: dedent`
		给你点颜色看看 | Give you some color to see see'
		[color] 指定想要看的颜色，可以为 hex, rgb, hsl, 颜色名称等。
		[gradient] 指定线性渐变，其内部参数用 / 隔开：
			第一个参数可以是角度，如 45deg。
			随后的参数每个表示一个渐变点。渐变点由偏移和颜色组成，用 : 隔开，如 0.5:red。
		不指定 [color] 和 [gradient] 时，随机生成一个纯色
		[len] 指定色图的边长，在 1-100 像素之间。纯色时默认为 20 像素，渐变时默认为 30 像素。
	`,
	alias: [ '色色' ],
	args: [
		{ ty: '$msg' },
		'color:str:opt',
		'gradient:str:opt',
		{ name: 'len', ty: 'num', opt: true, int: true, min: 1, max: 100 }
	],
	fn: (msg, color, gradient, len) => {
		if (color === 'yellow' && Math.random() > 0.5) {
			if (bot.cmds.subs.pixiv) {
				msg.raw_message = 'pixiv.rank'
				return runCmd(msg)
			}
			return new CmdError('不支持该颜色……？')
		}

		len ??= gradient ? 30 : 20
		const cvs = canvas.createCanvas(len, len)
		const ctx = cvs.getContext('2d')
		if (gradient) {
			const points = gradient.split('/')
			let deg = 0
			if (points[0].match(/^\d+(\.\d+)?deg$/)) {
				deg = + points.shift().slice(0, - 3)
				deg %= 360
			}
			const rad = deg / 180 * Math.PI
			if (deg !== 90) {
				color = ctx.createLinearGradient(
					len / 2 * (1 + Math.tan(rad)), 0,
					len / 2 * (1 - Math.tan(rad)), len
				)
			}
			else {
				color = ctx.createLinearGradient(
					0, len / 2,
					len, len / 2
				)
			}
			for (const p of points) {
				const [ stop, c ] = p.split(':')
				if (isNaN(+ stop) || ! c) return '不合规渐变点 ' + p
				color.addColorStop(+ stop, c)
			}
		}
		else {
			color ??= '#' + ('000000' + (Math.random() * 1e6 | 0).toString(16)).slice(- 6)
		}
		ctx.fillStyle = color
		ctx.fillRect(0, 0, len, len)
		return [
			'给你点颜色看看：' + (gradient ?? color),
			segment.image(cvs.toBuffer('image/png'))
		]
	}
})
