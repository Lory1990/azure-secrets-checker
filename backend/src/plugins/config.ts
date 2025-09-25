import { FastifyInstance, FastifyPluginOptions } from "fastify"
import fastifyEnv from "@fastify/env"
import fastifyPlugin from "fastify-plugin"

import dotenv from "dotenv"
dotenv.config()

const NODE_ENVS = Object.freeze<string[]>(["development", "prod", "test", "local"])

export default fastifyPlugin(
    (fastify: FastifyInstance, _options: FastifyPluginOptions, done: (err?: Error | undefined) => void) => {
        const schema = {
            type: "object",
            required: [],
            properties: {
                NODE_ENV: {
                    type: "string",
                    default: "prod"
                },
                TENANT_ID: {
                    type: "string"
                },
                CLIENT_ID: {
                    type: "string"
                },
                CLIENT_SECRET: {
                    type: "string"
                },
                ACS_ENDPOINT: {
                    type: "string"
                },
                EMAIL_FROM: {
                    type: "string"
                }
            }
        }

        const configOptions = {
            // decorate the Fastify server instance with `config` key
            // such as `fastify.config('PORT')
            confKey: "config",
            // schema to validate
            schema: schema,
            // source for the configuration data
            data: process.env,
            // will read .env in root folder
            dotenv: true,
            // will remove the additional properties
            // from the data object which creates an
            // explicit schema
            removeAdditional: true
        }

        /* istanbul ignore next */
        if (NODE_ENVS.find(validName => validName === (process.env.NODE_ENV ?? "prod")) === undefined) {
            throw new Error("NODE_ENV is not valid, it must be one of 'prod', 'test' or 'local', not \"" + process.env.NODE_ENV + '"')
        }

        fastifyEnv(fastify, configOptions, done)
    },
    { name: "config" }
)
