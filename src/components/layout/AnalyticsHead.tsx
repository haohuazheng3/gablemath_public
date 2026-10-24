import { SITE } from "@/lib/site";

/**
 * Inline <head> loader for FlowGlance (our only analytics).
 * - Defines the fw() queue stub so calls before load are kept.
 * - Respects the visitor's consent choice: declined → never loads.
 *   Visitors whose time zone is in Europe (GDPR/UK GDPR) are opt-in;
 *   everyone else is opt-out (US privacy-law model) and can decline any time.
 * - A Global Privacy Control signal (navigator.globalPrivacyControl) counts as an opt-out.
 * - The site owner's browsers carry fw_exclude=1 so their visits don't count.
 */
export function AnalyticsHead() {
  const code = `(function(){try{
window.fw=window.fw||function(){(window.fw.q=window.fw.q||[]).push(arguments)};
var c=null;try{c=localStorage.getItem('gm-consent')}catch(e){}
var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
var eu=/^(Europe|Atlantic\\/(Reykjavik|Canary|Madeira|Faroe))/.test(tz);
window.__gmConsentRegion=eu?'opt-in':'opt-out';
var gpc=navigator.globalPrivacyControl===true;
if(c==='denied'||(gpc&&c!=='granted')||(eu&&c!=='granted'))return;
var s=document.createElement('script');s.defer=true;s.src='https://flowglance.com/fw.js';
s.setAttribute('data-site','${SITE.flowglanceSiteKey}');document.head.appendChild(s);
}catch(e){}})();`;
  return <script id="gm-analytics" dangerouslySetInnerHTML={{ __html: code }} />;
}

/** Applies the saved theme before paint to avoid a light/dark flash. */
export function ThemeHead() {
  const code = `(function(){try{var t=localStorage.getItem('gm-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;
  return <script id="gm-theme" dangerouslySetInnerHTML={{ __html: code }} />;
}
