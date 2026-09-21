import assert from 'node:assert/strict'
import { normalizeBrazilianWhatsAppNumber } from '../src/modules/core/members/phone'

const cases: Array<[string | null, string | null]> = [
  ['55996320687', '5555996320687'],
  ['(55) 99632-0687', '5555996320687'],
  ['55 99632-0687', '5555996320687'],
  ['5555996320687', '5555996320687'],
  ['11987654321', '5511987654321'],
  ['5133224455', '555133224455'],
  [null, null],
  ['123456', null],
]

for (const [input, expected] of cases) assert.equal(normalizeBrazilianWhatsAppNumber(input), expected, input || 'vazio')
console.log('WhatsApp normalization tests validated.')
