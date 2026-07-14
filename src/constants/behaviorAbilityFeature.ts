/** Behavior-ability publishing is enabled by default now that the norm-table
 * administration contract is available. Deployments can still use `false` as
 * an emergency rollback switch. */
export const isBehaviorAbilityPublishingEnabled = (): boolean => process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED !== 'false'
