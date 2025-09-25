import 'dotenv/config';
import Fastify from 'fastify';
import { AzureService } from './azureService.js';
import { Scheduler } from './scheduler.js';

const fastify = Fastify({
  logger: true
});

const azureService = new AzureService();
const scheduler = new Scheduler();

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/applications', async (request, reply) => {
  try {
    const applications = await azureService.getAllApplicationsWithSecrets();
    return {
      success: true,
      count: applications.length,
      data: applications
    };
  } catch (error) {
    fastify.log.error('Error fetching applications:', error);
    reply.status(500);
    return {
      success: false,
      error: 'Failed to fetch applications',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

fastify.get('/applications/expiring', async (request, reply) => {
  try {
    const query = request.query as { days?: string };
    const days = query.days ? query.days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)) : [15, 10, 5, 4, 3, 2, 1, 0];

    const applications = await azureService.getApplicationsExpiringInDays(days);

    return {
      success: true,
      count: applications.length,
      thresholds: days,
      data: applications
    };
  } catch (error) {
    fastify.log.error('Error fetching expiring applications:', error);
    reply.status(500);
    return {
      success: false,
      error: 'Failed to fetch expiring applications',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

fastify.post('/check-now', async (request, reply) => {
  try {
    await scheduler.runImmediateCheck();
    return {
      success: true,
      message: 'Secret expiration check completed'
    };
  } catch (error) {
    fastify.log.error('Error running immediate check:', error);
    reply.status(500);
    return {
      success: false,
      error: 'Failed to run immediate check',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

fastify.get('/test-services', async (request, reply) => {
  try {
    await scheduler.testServices();
    return {
      success: true,
      message: 'All services tested successfully'
    };
  } catch (error) {
    fastify.log.error('Error testing services:', error);
    reply.status(500);
    return {
      success: false,
      error: 'Service test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';

    console.log('🚀 Starting Azure Secrets Checker...');
    console.log(`📡 Server will listen on ${host}:${port}`);

    console.log('🔧 Testing services...');
    await scheduler.testServices();

    await fastify.listen({ port, host });

    console.log('⏰ Starting scheduler...');
    scheduler.startScheduler();

    console.log('✅ Azure Secrets Checker is running!');
    console.log(`🌐 API available at http://${host}:${port}`);
    console.log('📋 Available endpoints:');
    console.log('   GET  /health                    - Health check');
    console.log('   GET  /applications              - Get all applications with secrets');
    console.log('   GET  /applications/expiring     - Get applications with expiring secrets');
    console.log('   POST /check-now                 - Run immediate expiration check');
    console.log('   GET  /test-services             - Test Azure and Mail services');

  } catch (err) {
    console.error('❌ Error starting server:', err);
    fastify.log.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('🛑 Shutting down Azure Secrets Checker...');

  try {
    scheduler.stopScheduler();
    await fastify.close();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();