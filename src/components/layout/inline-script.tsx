/** Runs before first paint on full page loads (see Next.js "preventing flash" guide). */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )pref_theme=([^;]+)/);var t=m?m[1]:'system';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;
