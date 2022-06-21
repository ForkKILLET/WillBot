import Fastify		from 'fastify'

export let server
let listening = false

export const init = () => {
    if (! bot.cfg.server.port) return

    server = Fastify()
}

export const reload = async () => {
    if (listening) await server.close()
    listening = true

    const { port } = bot.cfg.server
    await server.listen({ port })
    bot.logger.mark(`Fastify listening at http://127.0.0.1:${port}.`)
}