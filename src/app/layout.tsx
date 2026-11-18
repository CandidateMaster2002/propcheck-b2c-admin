import './globals.css';

export const metadata = {
  title: 'Prop Right - Property Inspection',
  description: 'Property snagging and quality control management',
  icons: {
    icon: '/images/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mdi/font@7.2.96/css/materialdesignicons.min.css" />
      </head>
      <body className="font-nunito">
        {children}
      </body>
    </html>
  );
}
