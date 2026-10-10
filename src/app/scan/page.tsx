import { redirect } from 'next/navigation'
import { getDeviceBusinessId } from '@/lib/device'
import ScanClient from './scan-client'

export default async function ScanPage() {
  const result = await getDeviceBusinessId()

  if ('error' in result) {
    redirect('/scan/pair')
  }

  return <ScanClient />
}