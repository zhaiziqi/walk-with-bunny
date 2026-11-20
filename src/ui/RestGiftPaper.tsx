import { useId } from 'react';

/** Separate paper folds let the wrapping uncover the keepsake in the same space. */
export function RestGiftPaper({ part }: { part: 'bed' | 'left' | 'right' }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`rest-paper rest-paper-${part}`} viewBox="0 0 600 420" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-wash`} x1="140" y1="90" x2="400" y2="330" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fffaf0"/><stop offset=".55" stopColor="#eee0cf"/><stop offset="1" stopColor="#faf0df"/>
      </linearGradient>
      <filter id={`${id}-grain`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="8" result="noise"/>
        <feColorMatrix in="noise" type="saturate" values="0"/>
        <feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer>
        <feComposite in2="SourceGraphic" operator="in"/>
        <feBlend in="SourceGraphic" mode="soft-light"/>
      </filter>
    </defs>
    {part === 'bed' ? <>
      <path d="m94 151 31-29 35 3 29-32 45 9 38-16 35 16 45-7 30 20 48-4 19 26 34 7 13 34 23 22-13 31 6 28-32 19-25 30-39-4-31 22-37-9-35 13-40-15-33 5-23-27-36-4-12-34-25-17 13-28Z" fill={`url(#${id}-wash)`} filter={`url(#${id}-grain)`}/>
      <g stroke="#c8b6a2" strokeOpacity=".24" strokeWidth=".9" strokeLinejoin="round">
        <path d="m94 151 75 37-9-63m29-32 20 62 63-69m35 16-24 49 69-56m30 20-4 55 71-33m34 7-39 60 75-4m-26 78-72-45 47 75m-95 9-1-56-65 60m-35-15 29-52-62 57m-23-27 31-51-79 13"/>
      </g>
      <path d="m169 188 40-33 74-4 95 19 66 34-23 29-87 28-83-6-55-26Z" fill="#fff9ed" fillOpacity=".38"/>
    </> : part === 'left' ? <>
      <path d="m120 160 18-32 39-17 51 16 57-13 46 22 18 34-19 31 21 29-25 40-65 19-46-12-50 13-28-21 4-32-29-29Z" fill={`url(#${id}-wash)`} filter={`url(#${id}-grain)`}/>
      <path d="m138 128 37 52-34 57m36-126 32 72 76-69m-53 18 47 49 52-45m-190 101 74-13 46 65m-86-109 40 44 64-43 51 20m-51-20 47 89" stroke="#c4af98" strokeOpacity=".23" strokeWidth=".85"/>
    </> : <>
      <path d="m288 132 51-17 31 14 44-13 36 24 31 4 7 43-16 21 18 39-25 27-42-7-29 25-44-17-40 12-23-25 7-40-21-25 15-31Z" fill={`url(#${id}-wash)`} filter={`url(#${id}-grain)`}/>
      <path d="m339 115 29 67 46-66m-46 66 82-42m-82 42 22 44 91-82m-91 82 82-18m-82 18 33 41m-33-41-40 49m-40-143 58 50-64 40m6 65 80-61 75 48" stroke="#c4af98" strokeOpacity=".23" strokeWidth=".85"/>
    </>}
  </svg>;
}
