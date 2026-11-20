import { useId, useState } from 'react';
import { content } from '../config/content';
import '../styles/gift-objects.css';

export type GiftKind = 'passport-holder' | 'sleep-mask';

/** Each discovery owns one illustration and one optional name tag. */
export function GiftKeepsake({ kind, imageSrc }: { kind: GiftKind; imageSrc?: string }) {
  const namesId = useId();
  const [namesRevealed, setNamesRevealed] = useState(false);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const name = content.gift.items.find(item => item.id === kind)!.name;
  const hasImage = !!imageSrc && failedSource !== imageSrc;
  return <figure className="gift-still-life gift-keepsake-single" data-keepsake={kind}>
    <div className="gift-keepsake-art">
      {hasImage ? <img className="gift-keepsake-painting" src={imageSrc} alt={namesRevealed ? `An illustration of a ${name.toLowerCase()}.` : 'A small keepsake resting on soft paper.'} onError={() => setFailedSource(imageSrc)}/>
        : <div className="gift-single-sketch" role="img" aria-label={namesRevealed ? name : 'A small keepsake resting on soft paper.'}>
          <svg className="gift-keepsake-tissue" viewBox="0 0 420 250" fill="none" aria-hidden="true" focusable="false">
            <ellipse cx="211" cy="205" rx="133" ry="17" fill="#78816f" fillOpacity=".035"/>
            <path d="m60 94 88-33 172 26 44 102-110 27-163-27Z" fill="#f1e9d8" fillOpacity=".6"/>
            <path d="m79 82 86-31 164 42-20 103-167 21-52-54Z" fill="#fffbf0" fillOpacity=".8"/>
            <path d="m79 82 63 135m-52-54 219 33m20-103-20 103" stroke="#e7dfcc" strokeWidth=".8" strokeOpacity=".7"/>
          </svg>
          <GiftObjectIllustration kind={kind}/>
        </div>}
    </div>
    <figcaption>
      <button type="button" className={`gift-name-tag${namesRevealed ? ' is-revealed' : ''}`} aria-expanded={namesRevealed} aria-controls={namesId} aria-label={namesRevealed ? `${name}. Turn the tag back over` : 'Turn the paper tag over'} onClick={() => setNamesRevealed(value => !value)}>
        {!namesRevealed && <svg className="gift-tag-bunny" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
          <path d="M15 24C12 17 12 5 16 5c4 0 6 11 6 16h4c0-5 2-16 6-16s4 12 1 19c5 3 7 7 6 12-1 6-7 8-15 8S10 42 9 36c-1-5 1-9 6-12Z" fill="#f9f4e8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
          <path d="M16 10c1 3 2 7 2 10m14-10c-1 3-2 7-2 10" stroke="#d7b5af" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="18" cy="32" r="1.2" fill="currentColor"/><circle cx="30" cy="32" r="1.2" fill="currentColor"/>
          <path d="m22 35 2 2 2-2" fill="#d7b5af" stroke="#d7b5af" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
        <span id={namesId} className="gift-tag-names" aria-live="polite" hidden={!namesRevealed}>{namesRevealed && name}</span>
      </button>
    </figcaption>
  </figure>;
}

/** An illustrated parcel; its opening is presentation, never unlock state. */
export function GiftParcel({ opening, reduced }: { opening: boolean; reduced: boolean }) {
  return <svg className={`gift-parcel ${opening ? 'gift-parcel-opening' : ''} ${reduced ? 'gift-parcel-quiet' : ''}`}
    viewBox="0 0 320 190" fill="none" aria-hidden="true" focusable="false">
    <ellipse className="parcel-contact" cx="167" cy="159" rx="102" ry="11" fill="#78806b" fillOpacity=".09"/>
    <ellipse cx="167" cy="160" rx="76" ry="5" fill="#78806b" fillOpacity=".07"/>
    <g stroke="#9b9e88" strokeWidth=".85" strokeLinejoin="round">
      <path d="m65 82 89-26 110 36-87 27Z" fill="#dbd5bd"/>
      <path d="m65 82 112 37v41L65 124Z" fill="#e8dfc9"/>
      <path d="m177 119 87-27v42l-87 26Z" fill="#d8d5bf"/>
      <path d="m70 87 103 34v34L70 121Z" stroke="#f8f2e2" strokeOpacity=".75"/>
      <path d="m178 123 82-25v32l-82 25" stroke="#f3eddb" strokeOpacity=".6"/>
      <path d="m110 97 19 6v41l-19-6Z" fill="#b7c0aa" stroke="none"/>
      <path d="m216 107 14-5v41l-14 5Z" fill="#a9b49b" stroke="none"/>
      <path d="m117 102 1 35m106-30v34" stroke="#e5e8d5" strokeOpacity=".58"/>
      <path className="parcel-inner-light" d="m69 81 85-23 105 34-82 25Z" fill="#fff8e4" stroke="none"/>
    </g>
    <g className="parcel-lid" stroke="#969c83" strokeWidth=".85" strokeLinejoin="round">
      <path d="m59 68 119 39v13L59 80Z" fill="#e9e3cf"/>
      <path d="m178 107 93-28v13l-93 28Z" fill="#d4d6bd"/>
      <path d="m59 68 93-28 119 39-93 28Z" fill="#f4efdf"/>
      <path d="m65 68 87-25 113 36-87 25Z" stroke="#fffdf0" strokeOpacity=".85"/>
      <path d="m104 82 91-28 18 6-91 28Z" fill="#b9c3ad" stroke="none"/>
      <path d="m109 84 18 6v13l-18-6Z" fill="#adbba1" stroke="none"/>
      <path d="m107 54 112 40 18-6-112-40Z" fill="#b3bea5" stroke="none"/>
      <path d="m219 94 18-6v13l-18 6Z" fill="#a6b397" stroke="none"/>
      <path d="m113 85 91-28m-89-6 112 40" stroke="#e0e5ce" strokeOpacity=".75"/>
      <g className="parcel-bow" strokeWidth="1.3" strokeLinecap="round">
        <path d="M164 72c-18-1-39-11-31-20 8-9 25 5 31 20Z" fill="#c6ceba"/>
        <path d="M165 72c4-17 18-25 26-18 9 9-11 18-26 18Z" fill="#c0cbb3"/>
        <path d="M160 74c-7 4-16 8-25 8m32-7c4 6 11 13 19 16"/>
        <path d="M159 69c3-3 8-2 10 1l-2 7-7-1Z" fill="#aebc9f"/>
        <path d="M135 54c7 1 16 7 24 15m10 0c8-7 12-11 19-12" stroke="#eef0dc" strokeWidth=".7"/>
      </g>
    </g>
  </svg>;
}

/** Neutral sketches of the gift types, not depictions of their final products. */
export function GiftObjectIllustration({ kind }: { kind: GiftKind }) {
  return <svg className={`gift-object-illustration gift-object-${kind}`} viewBox="0 0 200 140" fill="none" aria-hidden="true" focusable="false">
    {kind === 'passport-holder' ? <>
      <ellipse cx="104" cy="119" rx="49" ry="6" fill="#78816f" fillOpacity=".08"/>
      <g transform="rotate(-8 100 70)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M65 19 131 22q5 1 5 6l-1 89-68-2q-7 0-7-6V26q0-6 5-7Z" fill="#b9c5b0" stroke="#85977d" strokeWidth="1.15"/>
        <path d="m67 22 63 3q3 0 3 4l-1 84-64-2q-4 0-4-4V27q0-5 3-5Z" stroke="#edf0df" strokeOpacity=".9" strokeWidth=".8" strokeDasharray="2 3"/>
        <path d="m62 25 1 82q0 5 5 5l65 2" stroke="#819578" strokeWidth=".7"/>
        <path d="m70 26 55 1m-55 4 34 1" stroke="#dce3ce" strokeWidth=".8" strokeOpacity=".7"/>
        <ellipse cx="99" cy="67" rx="15" ry="16" stroke="#71886c" strokeWidth="1.15"/>
        <path d="M85 66h28M88 57q11 5 22 1M88 76q11-4 21-1M98 51c-8 9-8 22 1 32m0-32c8 9 9 23 0 32" stroke="#71886c" strokeWidth=".85"/>
        <path d="m89 93 20 1m-15 6 9 .5" stroke="#71886c" strokeWidth="1"/>
      </g>
    </> : <>
      <ellipse cx="101" cy="115" rx="66" ry="5" fill="#817772" fillOpacity=".07"/>
      <path d="M45 69c-10-4-12-19-7-27 7-13 36-22 67-22 35 0 59 11 62 25 1 7-2 15-9 22" stroke="#c0aaa5" strokeWidth="8" strokeLinecap="round"/>
      <path d="M44 66c-8-4-10-15-6-22 8-13 35-21 67-21 33 0 56 10 59 23 1 6-2 12-7 17" stroke="#e4d3cc" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M41 52q13-15 40-8c9 3 13 7 19 7s13-5 23-7q26-6 37 9c8 11 3 40-10 50-11 10-25 11-34-1-7-10-9-18-16-18-8 0-11 8-18 19-8 11-23 10-34-1-13-13-17-38-7-50Z" fill="#e1ccc5" stroke="#b69c95" strokeWidth="1.1" strokeLinejoin="round"/>
      <path d="M44 57c7-11 22-12 36-7 9 3 15 7 21 7s15-5 23-7c14-4 25-2 31 8 6 10 0 32-9 41-10 9-19 6-25-3-7-10-12-18-21-18-10 0-15 9-22 19-6 9-16 10-25 2-11-11-16-32-9-42Z" stroke="#f8ede5" strokeWidth=".9" strokeDasharray="2 3"/>
      <path d="M50 58q11-5 24-1m57-1q11-3 18 2" stroke="#ecdcd4" strokeWidth="2" strokeLinecap="round"/>
      <path d="M47 83q6 12 15 14m82-15q-4 11-12 15" stroke="#c4aaa3" strokeWidth=".8" strokeOpacity=".7" strokeLinecap="round"/>
    </>}
  </svg>;
}
