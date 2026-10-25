import { redirect } from 'next/navigation'
import { getDeviceBusinessId } from '@/lib/device'
import ScanClient from './scan-client'
import CrocodeileLogo from '@/components/crocodeile-logo'

export default async function ScanPage() {
  const result = await getDeviceBusinessId()

  if ('error' in result) {
    redirect('/scan/pair')
  }

  return (
    <>
      <nav className="px-4 py-3" style={{ background: 'var(--forest)' }}>
        <div className="max-w-sm mx-auto flex items-center gap-2.5">
          <CrocodeileLogo size={32} />
          <span className="text-white font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Escáner de cajero
          </span>
        </div>
      </nav>
      <ScanClient />
    </>
  )
}