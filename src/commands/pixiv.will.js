import * as cheerio from 'cheerio'
import fetch        from 'node-fetch'
import dedent       from 'dedent'
import { segment }  from 'oicq'
import {
    randomItem, streamToBuffer
}                   from '../util/toolkit.js'

const pixiv = 'https://www.pixiv.net'

const modes = [ 'daily', 'weekly', 'monthly', 'rookie', 'original', 'male', 'female' ]

export default ({ command: { CmdError } }) => {
    const subs = {
        rank: {
            help: dedent`
                Get artwork from Pixiv ranking.
                Available [mode]: ${modes.join(', ')}.
                Use [rank] to get the artwork at a specific ranking, or get a random one.
                Use YYYYMMDD to specify [date].
            `,
            args: [
                { ty: 'str', name: 'mode', opt: true },
                { ty: 'bool', name: 'r18', opt: true },
                { ty: 'num', name: 'date', opt: true },
                { ty: 'num', name: 'rank', int: true, opt: true }
            ],
            async * fn (mode = 'daily', r18, date, rk) {
                if (! modes.includes(mode))
                    return new CmdError('Illegal mode.')
                if (r18) {
                    return new CmdError('R18 is not available now.')
                    if (! [ 'daily', 'weekly', 'male', 'female' ].includes(mode))
                        return new CmdError('Illegal R18 mode.')
                    mode += '_r18'
                }
                const param = { mode }
                if (date) param.date = date
                const rank = await (await fetch(`${pixiv}/ranking.php?` + new URLSearchParams(param))).text()
                const $rank = cheerio.load(rank)
                const workUrls = [ ... $rank('.ranking-items > section > div > a.work') ].map(el => el.attribs.href)

                const artUrl = rk ? workUrls[rk - 1] : randomItem(workUrls)
                const artId = artUrl.split('/').at(-1)

                yield `Getting ${rk ? rk + '#' : 'a random'} artwork from ${mode} ranking. id: ${artId}`

                yield await subs.get.fn(artId)
            }
        },

        get: {
            help: 'Get a Pixiv artwork by <id>.',
            args: [
                { ty: 'str', name: 'id' }
            ],
            fn: async (id) => {
                const artUrl = `${pixiv}/artworks/${id}`
                const art = await (await fetch(artUrl)).text()

                bot.art = art

                const $art = cheerio.load(art)

                const [ $data ] = $art('#meta-preload-data')
                const data = JSON.parse($data.attribs.content.replace(/\r\n/g, ''))
                const imgData = data.illust[id]

                const img = await fetch(imgData.urls.regular, {
                    headers: {
                        Referer: artUrl
                    }
                })

                return segment.image(await streamToBuffer(img.body))
            }
        }
    }

    return {
        help: 'Pixiv!',
        subs
    }
}