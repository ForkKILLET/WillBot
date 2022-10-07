import Fastify		from 'fastify'

export let server

export const clean = async () => {
    if (server) {
        await server.close()
    }
    server = Fastify()
}

export const start = async () => {
    const { port } = bot.cfg.server

	if (port) {
		await server.listen({ port })
		bot.logger.mark(`Fastify listening at http://127.0.0.1:${port}.`)
	}
}
