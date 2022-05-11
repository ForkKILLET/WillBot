import puppeteer	from 'puppeteer'
import { segment }	from 'oicq'

export default () => ({
	help: 'GitHub tools',
	subs: {
		stat: {
			help: 'Get GitHub <user> stat image from vercel',
			args: [ { ty: 'str', name: 'user' } ],
			fn: async (username) => {
				const url = 'https://github-readme-stats-one-bice.vercel.app/api?' + new URLSearchParams({
					username,
					disable_animations: true
				})

				const browser = await puppeteer.launch()
				const page = await browser.newPage()
				await page.goto(url)
				await page.waitForSelector('svg')
				const $svg = await page.$('svg')
				const image = await $svg.screenshot({ type: 'png' })
				await browser.close()
				return segment.image(image)
			}
		}
	}
})
