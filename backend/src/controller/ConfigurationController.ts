import { FastifyInstance } from "fastify"
import ConfigResponseDTO from "../types/ConfigResponseDTO"

export default async function configurationController(fastify: FastifyInstance) {
    fastify.get("/configuration", async (request, reply) => {
        const response: ConfigResponseDTO = {
            tenantId: process.env.TENANT_ID!,
            clientId: process.env.CLIENT_ID!,
            redirectUri: process.env.REDIRECT_URI,
            authority: process.env.AUTHORITY,
            scopes: process.env.SCOPES,
            apiAudience: process.env.API_AUDIENCE
        }
        return reply.send(response)
    })
}
