import { PersonalityModelEditorStore } from './personalityModelEditorStore'

describe('PersonalityModelEditorStore creation contract', () => {
  it('rejects a new typology model before creating side effects when code is empty', async () => {
    const store = new PersonalityModelEditorStore()

    await expect(store.saveBasicInfo()).rejects.toThrow('请输入模型编码')
  })
})
