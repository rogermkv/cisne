import type { FastifyPluginAsync } from 'fastify'

import { authPlugin } from './auth/plugin.js'
import { authRoutes } from './auth/routes.js'
import { healthRoutes } from './routes/health.js'
import { memberRoutes } from './members/routes.js'
import { visitorRoutes } from './visitors/routes.js'
import { memberAreaRoutes } from './member-area/routes.js'
import { financeRoutes } from './finance/routes.js'
import { reservationRoutes } from './reservations/routes.js'
import { communicationsRoutes } from './communications/routes.js'
import { accessRoutes } from './access/routes.js'

export const coreModule: FastifyPluginAsync = async (app) => {
  await authPlugin(app, {})
  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(memberRoutes)
  await app.register(visitorRoutes)
  await app.register(memberAreaRoutes)
  await app.register(financeRoutes)
  await app.register(reservationRoutes)
  await app.register(communicationsRoutes)
  await app.register(accessRoutes)
}
