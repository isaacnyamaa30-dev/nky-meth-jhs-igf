export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-surface px-4 py-3 text-center text-xs text-muted print:hidden">
      <p>© {year} Nyankyerenease Methodist JHS. All rights reserved.</p>
      <p className="mt-0.5">
        Developed by <span className="font-medium text-foreground">Saris IT Solutions</span> ·{' '}
        <a href="tel:+233243744689" className="hover:text-brand-700 hover:underline">
          +233 24 374 4689
        </a>{' '}
        ·{' '}
        <a href="mailto:isaacnyamaa30@gmail.com" className="hover:text-brand-700 hover:underline">
          isaacnyamaa30@gmail.com
        </a>
      </p>
    </footer>
  )
}
