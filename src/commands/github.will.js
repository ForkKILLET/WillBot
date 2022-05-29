import puppeteer	from 'puppeteer'
import { segment }	from 'oicq'

export default () => ({
	help: 'GitHub tools',
	subs: {
		stat: {
			help: 'Get GitHub <user> stat image from vercel',
			args: [
				{ ty: '$self' },

				'username:str',

				'theme:str:opt',
				'title_color:str:opt',
				'text_color:str:opt',
				'icon_color:str:opt',
				'bg_color:str:opt',
				'hide_border:bool:opt',
				'cache_seconds:num:opt',
				'locale:str:opt',

				'include_all_commits:bool:opt',
				'count_private:bool:opt',
				'hide:str:opt',
				'hide_title:bool:opt',
				'hide_rank:bool:opt',
				'show_icons:bool:opt',
				'line_height:num:opt'
			],
			fn: async (self, ...rest) => {
				const url = 'https://github-readme-stats-one-bice.vercel.app/api?'
					+ new URLSearchParams(Object.assign(
						{ disable_animations: true },
						Object.fromEntries(rest
							.map((value, i) => [ self.args[i + 1].name, value ])
							.filter(([ , value ]) => value !== undefined)
						)
					))

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
