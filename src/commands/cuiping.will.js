import { render }	from 'cuiping'
import puppeteer	from 'puppeteer'
import { segment }	from 'oicq'

export default () => ({
	help: 'See https://github.com/ForkKILLET/cuiping.js',
	args: [ 'molecule:text' ],
	async fn(molecule) {
		let error
		const data = render(molecule, {
			renderer: 'svg',
			rendererOptions: {
				unitLen: 20,
				paddingX: 20,
				paddingY: 20,
				displayBonds: true,
				bondGap: 2,
				lineBaseColor: 'black',
				textBaseColor: 'black',
				halfFontSize: 8,
				halfTextBoxWidth: 6,
				halfTextBoxHeight: 8,
				displayTextBox: false			
			},
			onError: err => {
				error = err
			}
		})
		if (data) {
			const browser = await puppeteer.launch()
			const page = await browser.newPage()
			await page.setContent(data.svg)
			await page.waitForSelector('svg')
			const $svg = await page.$('svg')
			const image = await $svg.screenshot({ type: 'png' })
			await browser.close()
			return segment.image(image)	
		}
		return 'Error: ' + error
	}
})
