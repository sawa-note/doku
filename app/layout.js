export const metadata = {
  title: 'DOKU',
  description: '読んだ本を、思考の言葉に変える',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
