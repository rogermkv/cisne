import assert from 'node:assert/strict'
import { reservationTransitions } from '../src/modules/core/reservations/routes.js'

assert.deepEqual(reservationTransitions.REQUESTED, ['APPROVED', 'REJECTED', 'CANCELLED'])
assert.deepEqual(reservationTransitions.APPROVED, ['COMPLETED', 'CANCELLED'])
assert.deepEqual(reservationTransitions.COMPLETED, [])
assert.equal(reservationTransitions.REQUESTED.includes('COMPLETED'), false)
assert.equal(reservationTransitions.COMPLETED.includes('REQUESTED'), false)
console.log('Reservation status rules validated.')
