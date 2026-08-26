import { BehaviorAbilityStore } from './behaviorAbilityStore'

describe('BehaviorAbilityStore creation contract', () => {
  it('rejects a new non-scale model before creating side effects when code is empty', async () => {
    const store = new BehaviorAbilityStore()
    store.setProfile('brief2')

    await expect(store.saveBasicInfo()).rejects.toThrow('请输入模型编码')
  })
})
