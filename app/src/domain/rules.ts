import {
  IContestantRewardDetails,
  IContestVoterRewardDetails,
  IContestWinnerRewardDetails,
  ICustomRewardDetails,
  IEmailVerifiedDetails,
  IFollowerMilestoneReachedRewardDetails,
  IInviteAcceptedReferral,
  IInviteAcceptedUser,
  IPhoneNumberVerifiedDetails,
  IUserDailyVotesConsumedRewardDetails,
  IReferredUserXpMilestoneReachedRewardDetails,
  Reward,
  RewardType,
} from './reward.model'
import { IRewardRule } from './service'

export function contestVoterRule(
  userId: string,
  details: IContestVoterRewardDetails
): Reward<IContestVoterRewardDetails> {
  return new Reward<IContestVoterRewardDetails>({
    details,
    userId,
    reward: 1,
  }) as any
}

export function contestantJoinedRule(
  userId: string,
  details: IContestantRewardDetails
): Reward<IContestantRewardDetails> {
  return new Reward<IContestantRewardDetails>({
    details,
    userId,
    reward: 10,
  }) as any
}

export function contestWinnerRule(
  userId: string,
  details: IContestWinnerRewardDetails
): Reward<IContestWinnerRewardDetails> {
  let xp = 0

  switch (details.position) {
    case 1:
      xp = 100
      break
    case 2:
      xp = 50
      break
    case 3:
      xp = 20
      break
  }

  return new Reward({
    details,
    userId,
    reward: xp,
  })
}

export function customRule(userId: string, details: ICustomRewardDetails) {
  return new Reward({
    userId,
    details,
    reward: details.reward,
  })
}

export function phoneNumberVerifiedRule(
  userId: string,
  details: IPhoneNumberVerifiedDetails
) {
  return new Reward<IPhoneNumberVerifiedDetails>({
    details,
    userId,
    reward: 25,
  }) as any
}

export function emailVerifiedRule(
  userId: string,
  details: IEmailVerifiedDetails
) {
  return new Reward<IEmailVerifiedDetails>({
    details,
    userId,
    reward: 25,
  }) as any
}

export function inviteAcceptedReferralRule(
  userId: string,
  details: IInviteAcceptedReferral
) {
  return new Reward<IInviteAcceptedReferral>({
    details,
    userId,
    reward: 2,
  }) as any
}

export function inviteAcceptedUserRule(
  userId: string,
  details: IInviteAcceptedUser
) {
  return new Reward<IInviteAcceptedUser>({
    details,
    userId,
    reward: 2,
  }) as any
}

export function userDailyVotesConsumedRule(
  userId: string,
  details: IUserDailyVotesConsumedRewardDetails
): Reward<IContestVoterRewardDetails> {
  return new Reward<IUserDailyVotesConsumedRewardDetails>({
    details,
    userId,
    reward: 1,
  }) as any
}

export function followerMilestoneReachedRule(
  userId: string,
  details: IFollowerMilestoneReachedRewardDetails
): Reward<IContestVoterRewardDetails> {
  return new Reward<IFollowerMilestoneReachedRewardDetails>({
    details,
    userId,
    reward: details.milestone.reward,
  }) as any
}

export function referredUserXpMilestoneReachedRule(
  userId: string,
  details: IReferredUserXpMilestoneReachedRewardDetails
): Reward<ICustomRewardDetails> {
  return new Reward<IReferredUserXpMilestoneReachedRewardDetails>({
    details,
    userId,
    reward: details.milestone.reward,
  }) as any
}

export const rules: Map<RewardType, IRewardRule> = new Map()

rules.set(RewardType.ContestVoter, contestVoterRule)
rules.set(RewardType.ContestantJoined, contestantJoinedRule)
rules.set(RewardType.ContestWinner, contestWinnerRule)
rules.set(RewardType.Custom, customRule)
rules.set(RewardType.PhoneNumberVerified, phoneNumberVerifiedRule)
rules.set(RewardType.EmailVerified, emailVerifiedRule)
rules.set(RewardType.InviteAcceptedReferral, inviteAcceptedReferralRule)
rules.set(RewardType.InviteAcceptedUser, inviteAcceptedUserRule)
rules.set(RewardType.UserDailyVotesConsumed, userDailyVotesConsumedRule)
rules.set(RewardType.FollowerMilestoneReached, followerMilestoneReachedRule)
rules.set(
  RewardType.ReferredUserXpMilestoneReached,
  referredUserXpMilestoneReachedRule
)
