import { FastifyInstance } from 'fastify';
import { AzureService } from '../services/azureService';
import { Scheduler } from '../scheduler';


const ApplicationsController = async (fastify: FastifyInstance) => {

  const azureService = new AzureService();
  const scheduler = new Scheduler();

  fastify.get('/applications', async (request, reply) => {
    const applications = await azureService.getAllApplicationsWithSecrets();
    reply.send(applications)
  });

  fastify.get<{ Querystring: { days?: string } }>('/applications/expiring', async (request, reply) => {
    const query = request.query as { days?: string };
    const days = query.days ? query.days.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)) : [15, 10, 5, 4, 3, 2, 1, 0];

    const applications = await azureService.getApplicationsExpiringInDays(days);

    reply.send({
      thresholds: days,
      data: applications
    });
  });

  fastify.get('/check-now', async (request, reply) => {
    await scheduler.runImmediateCheck();
  });

  fastify.get('/test-services', async (request, reply) => {
    await scheduler.testServices();
  });
};

export default ApplicationsController