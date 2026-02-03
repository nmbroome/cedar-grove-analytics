import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { FirestoreDataProvider } from '@/context/FirestoreDataContext'

export const metadata = {
  title: 'Cedar Grove Analytics',
  description: 'Attorney time allocation and efficiency insights',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FirestoreDataProvider>
            {children}
          </FirestoreDataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}