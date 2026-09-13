import type { QSResponse } from '@/types/qs'
import { internalV2Get, internalV2PostOnce } from '@/api/qsServer'
import type {
  AssetKind,
  AssetPage,
  AssetDetail,
  CreateDraft,
  ReviseDraft,
  FreezeDraft,
  PromptDraft,
  PromptDraftLifecycle,
  FrozenPromptReceipt
} from './types'
import type { RegisterProfile, ProfileRegistrationReceipt } from './types'
export * from './types'

type Result<T> = Promise<[unknown, QSResponse<T> | undefined]>

const BASE = '/interpretation/ai-workflow'
const encode = encodeURIComponent
export const listAssets = (kind: AssetKind, identity = '', cursor = ''): Result<AssetPage> =>
  internalV2Get<AssetPage>(`${BASE}/assets/${kind}`, { identity, cursor, limit: 20 })
export const getAsset = (kind: AssetKind, identity: string, version: string): Result<AssetDetail> =>
  internalV2Get<AssetDetail>(`${BASE}/assets/${kind}/detail`, { identity, version })
export const createPromptDraft = (draftID: string, command: CreateDraft): Result<PromptDraft> =>
  internalV2PostOnce<PromptDraft>(`${BASE}/prompt-drafts/${encode(draftID)}/create`, command)
export const revisePromptDraft = (draftID: string, command: ReviseDraft): Result<PromptDraft> =>
  internalV2PostOnce<PromptDraft>(`${BASE}/prompt-drafts/${encode(draftID)}/revisions`, command)
export const getPromptDraft = (draftID: string): Result<PromptDraft> =>
  internalV2Get<PromptDraft>(`${BASE}/prompt-drafts/${encode(draftID)}`)
export const getPromptDraftLifecycle = (draftID: string): Result<PromptDraftLifecycle> =>
  internalV2Get<PromptDraftLifecycle>(`${BASE}/prompt-drafts/${encode(draftID)}/lifecycle`)
export const getDraftReceipt = (commandID: string): Result<PromptDraft> =>
  internalV2Get<PromptDraft>(`${BASE}/prompt-drafts/commands/${encode(commandID)}`)
export const freezePromptDraft = (
  draftID: string,
  command: FreezeDraft
): Result<FrozenPromptReceipt> =>
  internalV2PostOnce<FrozenPromptReceipt>(
    `${BASE}/prompt-drafts/${encode(draftID)}/freeze`,
    command
  )
export const getFreezeReceipt = (commandID: string): Result<FrozenPromptReceipt> =>
  internalV2Get<FrozenPromptReceipt>(`${BASE}/prompt-drafts/freeze-commands/${encode(commandID)}`)
export const registerProfile = (command: RegisterProfile): Result<ProfileRegistrationReceipt> =>
  internalV2PostOnce<ProfileRegistrationReceipt>(`${BASE}/profiles/register`, command)
export const getProfileReceipt = (commandID: string): Result<ProfileRegistrationReceipt> =>
  internalV2Get<ProfileRegistrationReceipt>(`${BASE}/profiles/commands/${encode(commandID)}`)
