/** Formal behavior-ability publishing remains off until the norm-table API,
 * Definition Execution OpenAPI, and runtime rollout are all deployed. */
export const isBehaviorAbilityPublishingEnabled = (): boolean => process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED === 'true'
