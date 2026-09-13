import type { PromptDraftLifecycle } from '@/api/path/aiWorkflow'

// Unknown/missing status must never turn a reopened immutable draft into an editor.
export function checkedLifecycle(value: PromptDraftLifecycle | undefined, id: string): PromptDraftLifecycle {
  const draft = value?.draft
  if (!value || value.schema_version !== 'qs-ai-prompt-lifecycle/v1' ||
    !draft || draft.draft_id !== id || !Number.isSafeInteger(draft.revision) || draft.revision < 1 ||
    !draft.content || !Array.isArray(draft.content.allowed_placeholders) ||
    !draft.content.allowed_placeholders.every((v) => typeof v === 'string') ||
    !['system_message', 'task_template', 'data_preamble'].every((key) =>
      typeof draft.content[key as keyof typeof draft.content] === 'string')) {
    throw new Error('草稿状态不完整')
  }
  if (value.status === 'editable' && value.frozen === undefined) return value
  const frozen = value.frozen
  if (value.status !== 'frozen' || !frozen || frozen.revision !== draft.revision ||
    frozen.asset?.identity !== draft.template_id || frozen.asset?.version !== draft.target_version ||
    !/^sha256:[a-f0-9]{64}$/.test(frozen.asset?.fingerprint || '') ||
    !/^[a-f0-9]{64}$/.test(frozen.asset?.content_sha256 || '') ||
    !Number.isFinite(Date.parse(frozen.frozen_at)) || !Number.isFinite(Date.parse(draft.saved_at)) ||
    Date.parse(frozen.frozen_at) < Date.parse(draft.saved_at)) {
    throw new Error('冻结状态与草稿不一致')
  }
  return value
}
