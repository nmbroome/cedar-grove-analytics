import './globals.css'

export const metadata = {
  title: 'Cedar Grove Analytics',
  description: 'Attorney time allocation and efficiency insights',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}