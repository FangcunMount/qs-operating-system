import { render, screen } from '@testing-library/react'
import App from './App'

jest.mock('./router/router', () => ({
  __esModule: true,
  default: function MockRouteView() {
    return <div>RouteView</div>
  }
}))

test('renders app shell successfully', () => {
  render(<App />)

  expect(screen.getByText('RouteView')).toBeInTheDocument()
  const appContainer = document.querySelector('.App')
  expect(appContainer).toBeInTheDocument()
})
