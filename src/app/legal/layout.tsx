import CrocodeileLogo from '@/components/crocodeile-logo'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="px-4 py-3" style={{ background: 'var(--forest)' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CrocodeileLogo size={32} />
            <span className="text-white font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Crocodeile
            </span>
          </div>
          <a href="/login" className="nav-icon-btn gap-1.5 text-sm font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Volver al login
          </a>
        </div>
      </nav>

      <main className="min-h-screen px-4 py-8 md:py-12" style={{ background: 'var(--paper)' }}>
        <div className="max-w-3xl mx-auto bg-surface rounded-xl border border-line p-6 md:p-10">
          {children}
        </div>
      </main>
    </>
  )
}
