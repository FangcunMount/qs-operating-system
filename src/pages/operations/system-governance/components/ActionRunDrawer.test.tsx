import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActionDescriptor, postSystemGovernanceActionRun } from '@/api/path/systemGovernance'
import { ActionRunDrawer } from './ActionRunDrawer'

jest.mock('@/api/path/systemGovernance', () => {
  const actual = jest.requireActual('@/api/path/systemGovernance')
  return {
    ...actual,
    postSystemGovernanceActionRun: jest.fn()
  }
})

const postActionRunMock = postSystemGovernanceActionRun as jest.Mock

const manualWarmupAction: ActionDescriptor = {
  id: 'cache.manual_warmup',
  domain: 'cache',
  label: '手工预热缓存',
  risk_level: 'low',
  enabled: true,
  planned: false,
  requires_confirmation: true,
  input_schema: {
    type: 'object'
  }
}

describe('ActionRunDrawer', () => {
  beforeEach(() => {
    postActionRunMock.mockReset()
    postActionRunMock.mockResolvedValue([null, {
      data: {
        action_id: 'cache.manual_warmup',
        status: 'succeeded'
      }
    }])
  })

  it('prefills initial input and blocks invalid JSON before request', async () => {
    render(
      <ActionRunDrawer
        action={manualWarmupAction}
        visible
        initialInput={{ targets: [{ kind: 'query.stats_system', scope: 'org:7' }] }}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByDisplayValue(/"scope": "org:7"/)).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue(/"scope": "org:7"/), { target: { value: '{' } })
    fireEvent.change(screen.getByPlaceholderText('确认执行 cache.manual_warmup'), { target: { value: '确认' } })
    fireEvent.click(screen.getByText(/执\s*行/))

    expect(await screen.findByText('输入 JSON 格式不正确')).toBeInTheDocument()
    expect(postActionRunMock).not.toHaveBeenCalled()
  })

  it('submits confirmed action with confirm=true', async () => {
    const onClose = jest.fn()
    render(
      <ActionRunDrawer
        action={manualWarmupAction}
        visible
        initialInput={{ targets: [{ kind: 'query.stats_system', scope: 'org:7' }] }}
        onClose={onClose}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('确认执行 cache.manual_warmup'), { target: { value: '确认' } })
    fireEvent.click(screen.getByText(/执\s*行/))

    await waitFor(() => {
      expect(postActionRunMock).toHaveBeenCalledWith('cache.manual_warmup', {
        input: {
          targets: [
            {
              kind: 'query.stats_system',
              scope: 'org:7'
            }
          ]
        },
        confirm: true
      })
    })
    expect(onClose).toHaveBeenCalled()
  })
})
