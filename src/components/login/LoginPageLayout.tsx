import React from 'react'
import type { ReactNode } from 'react'
import { brandAlt, brandAssets } from '@/config/brand'

interface LoginPageLayoutProps {
  brand: ReactNode
  panel: ReactNode
}

const LoginPageLayout: React.FC<LoginPageLayoutProps> = ({ brand, panel }) => (
  <div className="login-page">
    {brand}
    <main className="login-page__main">
      <div className="login-page__mobile-brand">
        <img src={brandAssets.lockup} alt={brandAlt} className="login-page__mobile-lockup" />
      </div>
      {panel}
    </main>
  </div>
)

export default LoginPageLayout
