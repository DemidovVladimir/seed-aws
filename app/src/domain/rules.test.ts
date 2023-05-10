import { RewardType } from './reward.model'
import {
  contestantJoinedRule,
  contestVoterRule,
  contestWinnerRule,
} from './rules'

describe('reward rules', () => {
  describe('contest voter rule', () => {
    it('should receive 1 xp after using all votes', () => {
      const result = contestVoterRule('userId', {
        contestId: 'contestId',
        type: RewardType.ContestVoter,
        voter: {
          remainVotes: 0,
        },
      })

      expect(result.reward).toBe(1)
    })
  })

  describe('contestant rule', () => {
    it('should receive 10 xp', () => {
      const result = contestantJoinedRule('userId', {
        contestId: 'contestId',
        type: RewardType.ContestantJoined,
      })

      expect(result.reward).toBe(10)
    })
  })

  describe('contest winner rule', () => {
    it('should receive 20 xp for the third place', () => {
      const result = contestWinnerRule('userId', {
        contestId: 'contestId',
        type: RewardType.ContestWinner,
        position: 3,
      })

      expect(result.reward).toBe(20)
    })

    it('should receive 50 xp for the second place', () => {
      const result = contestWinnerRule('userId', {
        contestId: 'contestId',
        type: RewardType.ContestWinner,
        position: 2,
      })

      expect(result.reward).toBe(50)
    })

    it('should receive 100 xp for the first place', () => {
      const result = contestWinnerRule('userId', {
        contestId: 'contestId',
        type: RewardType.ContestWinner,
        position: 1,
      })

      expect(result.reward).toBe(100)
    })
  })
})
