import './globals.css';

export const metadata = {
  title: 'Multi-Hospital HMS',
  description: 'Multi-Hospital Healthcare Management System — Team 16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
