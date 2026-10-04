import './globals.css';

export const metadata = {
  title: 'ET RATZON - Libro de Acordes',
  description: 'Sistema de alabanza y proyección en vivo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}