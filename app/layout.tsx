import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';

/* Montserrat variavel (pesos 400-900) self-hosted via next/font/local:
   mesmo resultado do next/font/google, sem depender do Google Fonts no build. */
const montserrat = localFont({
  src: [
    { path: './fonts/montserrat-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
    { path: './fonts/montserrat-latin-ext-wght-normal.woff2', weight: '400 900', style: 'normal' },
  ],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Diagnóstico Digital Grátis para Farmácias | Recepta Plus',
  description:
    'Diagnóstico digital gratuito da sua farmácia: Google, Instagram e concorrentes no seu raio, ao vivo na tela em ~1 minuto e com uma cópia no seu WhatsApp.',
};

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID || '';

function buildTrackingScript(): string {
  const parts: string[] = [];
  if (/^\d{5,}$/.test(PIXEL_ID)) {
    parts.push(
      "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
        "window.fbq('init','" + PIXEL_ID + "');window.fbq('track','PageView');"
    );
  }
  if (/^G-/.test(GA4_ID)) {
    parts.push(
      "(function(){var g=document.createElement('script');g.async=true;g.src='https://www.googletagmanager.com/gtag/js?id=" + GA4_ID + "';document.head.appendChild(g);" +
        "window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};window.gtag('js',new Date());window.gtag('config','" + GA4_ID + "');})();"
    );
  }
  parts.push(
    "window.receptaTrack=function(name,params){try{if(window.fbq){['Lead','CompleteRegistration'].indexOf(name)>-1?window.fbq('track',name,params||{}):window.fbq('trackCustom',name,params||{});}}catch(e){}try{if(window.gtag){window.gtag('event',name,params||{});}}catch(e){}};"
  );
  return parts.join('\n');
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.className}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: buildTrackingScript() }} />
        {children}
      </body>
    </html>
  );
}
