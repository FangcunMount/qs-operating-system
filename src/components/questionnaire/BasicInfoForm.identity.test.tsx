import { render } from '@testing-library/react'
import type { FormInstance } from 'antd/lib/form'
import { useBasicInfoForm } from './BasicInfoForm'

jest.mock('@/store', () => ({ scaleStore: {} }))

function prepare(type: 'survey' | 'scale', routeId = 'new') {
  const store: any = {
    id: 'existing-published', title: 'Existing title', desc: 'Existing description', img_url: '',
    loadFromLocalStorage: jest.fn(() => true),
    initSurvey: jest.fn(), initScale: jest.fn(), saveBasicInfo: jest.fn(),
    initEditor: jest.fn()
  }
  const initialize = () => { store.id = ''; store.title = ''; store.desc = '' }
  store.initSurvey.mockImplementation(initialize)
  store.initScale.mockImplementation(initialize)
  const form = { setFieldsValue: jest.fn(), validateFields: jest.fn() } as unknown as FormInstance
  function Harness() {
    useBasicInfoForm({ questionsheetid: routeId, type, store, form })
    return null
  }
  render(<Harness />)
  return { store, form }
}

it.each(['survey', 'scale'] as const)('new %s must not reuse the identity of a published editor draft', (type) => {
  const { store, form } = prepare(type)
  expect(store.id).toBe('')
  expect(store.title).toBe('')
  expect(store.loadFromLocalStorage).not.toHaveBeenCalled()
  expect(form.setFieldsValue).toHaveBeenCalledWith(expect.objectContaining({ title: '', desc: '' }))
  expect(store.initEditor).not.toHaveBeenCalled()
})

it('returning to an existing editor keeps its identity and unsaved basic information', () => {
  const { store, form } = prepare('survey', 'existing-published')
  expect(store.id).toBe('existing-published')
  expect(store.initSurvey).not.toHaveBeenCalled()
  expect(store.loadFromLocalStorage).not.toHaveBeenCalled()
  expect(form.setFieldsValue).toHaveBeenCalledWith(expect.objectContaining({ title: 'Existing title' }))
})
