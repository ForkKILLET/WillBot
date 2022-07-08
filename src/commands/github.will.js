import puppeteer	from 'puppeteer'
import { segment }	from 'oicq'

const githubRepo = /^(?:(?:https|git)(?::\/\/|@)github\.com[/:])?([^/:]+)\/(.+)(?:\.git$)?/
const githubUser = /^(?:https:\/\/github\.com\/)?([^/:]+)$/

const screenshotSvg = async (url) => {
	const browser = await puppeteer.launch()
	const page = await browser.newPage()
	await page.goto(url)
	await page.waitForSelector('svg')
	const $svg = await page.$('svg')
	const image = await $svg.screenshot({ type: 'png' })
	await browser.close()
	return segment.image(image)
}

export default ({ command: { CmdError } }) => ({
	help: 'GitHub tools',
	subs: {
		stat: {
			help: 'Get GitHub <user> stat image\n'
				+ 'From <https://github.com/anuraghazra/github-readme-stats>',
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
			fn: (self, username, ...rest) => {
				if (! (username = username.match(githubUser))) {
					return new CmdError('illegal username')
				}

				const url = 'https://github-readme-stats-one-bice.vercel.app/api?'
					+ new URLSearchParams(Object.assign(
						{ disable_animations: true, username: username[1] },
						Object.fromEntries(rest
							.map((value, i) => [ self.args[i + 2].name, value ])
							.filter(([ , value ]) => value !== undefined)
						)
					))

				return screenshotSvg(url)
			}
		},

		tokei: {
			help: 'Get lines of code of a GitHub <repo>.\n'
				+ 'Use [category] to show a different category than LoC.\n'
				+ 'From <https://github.com/XAMPPRocky/tokei>',
			args: [
				'repo:str',
				'category:str:opt'
			],
			fn: (repo, category = 'lines') => {
				if (! (repo = repo.match(githubRepo))) {
					return new CmdError('illegal repo')
				}

				const url = `https://tokei.rs/b1/github/${repo[1]}/${repo[2]}?`
					+ new URLSearchParams({ category })

				return screenshotSvg(url)
			}
		},

		starchart: {
			help: 'Plot a <repo> stars over time.\n'
				+ 'From <https://starchart.cc/caarlos0/starcharts>',
			alias: [ 'sc' ],
			args: [
				'repo:str'
			],
			fn: (repo) => {
				if (! (repo = repo.match(githubRepo))) {
					return new CmdError('illegal repo')
				}

				const url = `https://starchart.cc/${repo[1]}/${repo[2]}.svg`

				return screenshotSvg(url)
			}
		}
	}
})
