export function ScanlineOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 bg-scanline"
      style={{ opacity: 0.03 }}
      aria-hidden="true"
    />
  )
}
