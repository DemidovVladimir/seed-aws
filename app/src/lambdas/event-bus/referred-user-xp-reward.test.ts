import { getReferredUserXpMilestoneReachedReward } from './referred-user-xp-reward'

jest.mock('../../lib/amplitude', () => {
  return {
    default: {
      identify: jest.fn(),
    },
  }
})

describe('referred-user-xp-reward', () => {
  describe('getReferredUserXpMilestoneReachedReward', () => {
    const xps = [100, 200, 300, 400, 500, 220, 390, 190]
    const res = [
      [100, 10],
      [200, 20],
      [300, 30],
      [400, 40],
      [500, 50],
      [200, 20],
      [300, 30],
      [100, 10],
    ]

    it('should return expected results', async () => {
      const calculatedRes = xps.map((xp) =>
        getReferredUserXpMilestoneReachedReward(xp)
      )
      calculatedRes.forEach((cr, ind) => expect(cr).toEqual(res[ind]))
    })

    it('should return undefined', async () => {
      const calculatedRes = getReferredUserXpMilestoneReachedReward(10)
      expect(calculatedRes).toBeUndefined()
    })
  })
})
