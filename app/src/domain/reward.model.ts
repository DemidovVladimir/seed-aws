import { v4 as uuid } from 'uuid'

export enum RewardType {
  ContestantJoined = 'CONTESTANT_JOINED',
  ContestVoter = 'CONTEST_VOTER',
  ContestWinner = 'CONTEST_WINNER',
  Custom = 'CUSTOM',
  AccountCreated = 'ACCOUNT_CREATED', // Deprecated
  PhoneNumberVerified = 'PHONE_NUMBER_VERIFIED',
  EmailVerified = 'EMAIL_VERIFIED',
  InviteAcceptedReferral = 'INVITE_ACCEPTED_REFERRAL',
  InviteAcceptedUser = 'INVITE_ACCEPTED_USER',
  UserDailyVotesConsumed = 'USER_DAILY_VOTES_CONSUMED',
  FollowerMilestoneReached = 'FOLLOWER_MILESTONE_REACHED',
  ReferredUserXpMilestoneReached = 'REFERRED_USER_XP_MILESTONE_REACHED',
}

export const oneTimeRewardTypes = [
  RewardType.AccountCreated, // Deprecated
  RewardType.PhoneNumberVerified,
  RewardType.EmailVerified,
  RewardType.InviteAcceptedUser,
]

interface RewardDetails {
  type: RewardType
}

export interface IContestantRewardDetails extends RewardDetails {
  type: RewardType.ContestantJoined
  contestId: string
}

export interface IContestVoterRewardDetails extends RewardDetails {
  type: RewardType.ContestVoter
  contestId: string
  voter: {
    remainVotes: number
  }
}

export interface IContestWinnerRewardDetails extends RewardDetails {
  type: RewardType.ContestWinner
  contestId: string
  position: number
}

export interface ICustomRewardDetails extends RewardDetails {
  type: RewardType.Custom
  activityMessage?: string
  contestId?: string
  reward: number
}

// Deprecated
export interface IAccountCreatedDetails extends RewardDetails {
  type: RewardType.AccountCreated
}

export interface IPhoneNumberVerifiedDetails extends RewardDetails {
  type: RewardType.PhoneNumberVerified
}

export interface IEmailVerifiedDetails extends RewardDetails {
  type: RewardType.EmailVerified
}

export interface IInviteAcceptedReferral extends RewardDetails {
  type: RewardType.InviteAcceptedReferral
  refereeUsername: string
}

export interface IInviteAcceptedUser extends RewardDetails {
  type: RewardType.InviteAcceptedUser
}

export interface IUserDailyVotesConsumedRewardDetails extends RewardDetails {
  type: RewardType.UserDailyVotesConsumed
}

export interface IFollowerMilestoneReachedRewardDetails extends RewardDetails {
  type: RewardType.FollowerMilestoneReached
  milestone: {
    followerCount: number
    reward: number
  }
}
export interface IReferredUserXpMilestoneReachedRewardDetails
  extends RewardDetails {
  type: RewardType.ReferredUserXpMilestoneReached
  sourceUserId: string
  milestone: {
    xpCount: number
    reward: number
  }
}

export type IRewardReason =
  | IContestantRewardDetails
  | IContestVoterRewardDetails
  | IContestWinnerRewardDetails
  | ICustomRewardDetails
  | IAccountCreatedDetails // Deprecated
  | IPhoneNumberVerifiedDetails
  | IEmailVerifiedDetails
  | IInviteAcceptedReferral
  | IInviteAcceptedUser
  | IUserDailyVotesConsumedRewardDetails
  | IFollowerMilestoneReachedRewardDetails
  | IReferredUserXpMilestoneReachedRewardDetails

export interface IRewardCommand<T = IRewardReason> {
  userId: string
  reason: T
}

export interface IRewardEvent<T = IRewardReason> {
  id: string
  userId: string
  reward: number
  timestamp: Date
  reason: T
}

export interface IReward<T = IRewardReason> {
  id: string
  userId: string
  timestamp: Date
  reward: number
  details: T

  toEvent(): IRewardEvent<T>
}

export interface IRewardProps<T> {
  id?: string
  userId: string
  timestamp?: Date
  reward: number
  details: T
}

export class Reward<T = IRewardReason> implements IReward<T> {
  readonly id: string
  readonly userId: string
  readonly timestamp: Date
  readonly reward: number
  readonly details: T

  constructor({ id, userId, timestamp, reward, details }: IRewardProps<T>) {
    this.id = id || uuid()
    this.userId = userId
    this.timestamp = timestamp || new Date()
    this.reward = reward
    this.details = details
  }

  toEvent(): IRewardEvent<T> {
    return {
      id: this.id,
      userId: this.userId,
      reward: this.reward,
      timestamp: this.timestamp,
      reason: this.details,
    }
  }
}
