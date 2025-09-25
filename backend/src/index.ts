import dotenv from "dotenv"
import Fastify from 'fastify';
import { Scheduler } from './scheduler';
import AutoLoad from "@fastify/autoload"
import path from 'path';

export const fastify = Fastify({
  logger: true
});


let scheduler : Scheduler | undefined;

export async function build() {

  const startPlugins = performance.now()
    await fastify.register(AutoLoad, {
        dir: path.join(__dirname, "plugins")
    })
    fastify.log.info(`Plugins ${(performance.now() - startPlugins).toFixed(2)} ms`)

  const startControllers = performance.now()
  await fastify.register(AutoLoad, {
      dir: path.join(__dirname, "controller")
  })
  fastify.log.info(`Controllers ${(performance.now() - startControllers).toFixed(2)} ms`)

  return fastify
}

const start = async () => {
  dotenv.config()
  

  fastify.log.info('🚀 Starting Azure Secrets Checker...');

  fastify.log.info('🔧 Testing services...');

  await new Scheduler().testServices();

  await build()

  const port = parseInt(process.env.PORT || '3000');
  const host = process.env.HOST || '0.0.0.0';
  await fastify.listen({ port, host });

  fastify.log.info('⏰ Starting scheduler...');
  if(scheduler) scheduler.startScheduler();
  fastify.log.info('✅ Scheduler started');
};

const shutdown = async () => {
  console.log('🛑 Shutting down Azure Secrets Checker...');

  try {
    if(scheduler) scheduler.stopScheduler();
    await fastify.close();
    fastify.log.info('✅ Shutdown complete');
    process.exit(0);
  } catch (err : any) {
    fastify.log.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();