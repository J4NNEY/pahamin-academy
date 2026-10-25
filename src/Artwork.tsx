export function HeroArtwork() {
  return (
    <svg className="hero-art" viewBox="0 0 370 290" fill="none" aria-hidden="true">
      <ellipse cx="194" cy="259" rx="116" ry="14" fill="#174C40" opacity=".32" />
      <circle cx="235" cy="122" r="87" stroke="#6FA88C" strokeDasharray="4 8" opacity=".65" />
      <path d="M92 237 219 206 302 234 175 264Z" fill="#F2BB72" />
      <path d="m92 220 127-32 83 29v17l-127 31-83-28Z" fill="#EAA859" />
      <path d="m100 221 119-28 74 26v12l-118 27-75-25Z" fill="#FFF4DA" />
      <path d="m111 194 129-29 63 25-130 31-62-26Z" fill="#A3CDB1" />
      <path d="m111 177 129-30 63 26v17l-130 31-62-26Z" fill="#A3CDB1" />
      <path d="m120 178 119-26 75 25v11l-128 28-66-24Z" fill="#F8F6E7" />
      <path d="m119 145 86-38 70 18-79 42Z" fill="#FFF7DC" />
      <path d="m196 167 3-71 64-21 12 50Z" fill="#F4DFAA" />
      <path d="m119 145 7-66 73 17-3 71Z" fill="#FFF4D3" />
      <path d="m126 79 9-8 66 16 62-22v10l-64 21Z" fill="#F9CC81" />
      <path
        d="m139 91 43 11m-44 1 42 11m-44 1 43 11m-43 1 29 8m49-31 34-12m-33 24 35-12m-34 24 27-10"
        stroke="#C6AF78"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="m199 96-3 71" stroke="#CBB27B" strokeWidth="3" />
      <path d="m233 87 5 38 10-9 9 2-6-37" fill="#EF9876" />
      <path d="m73 89 8-15 17 4-8 14 4 17-16-6-14 9 2-17Z" fill="#FBC774" />
      <path d="m295 63 5-9 6 9 10 2-7 7 1 10-10-5-9 4 2-11-7-7Z" fill="#F7DFAC" />
      <path d="m69 162 5 8 9 2-7 6 1 9-8-5-8 4 1-9-6-6 9-1Z" fill="#E5AD81" />
      <circle cx="309" cy="132" r="7" fill="#93BA9D" />
      <circle cx="134" cy="44" r="4" fill="#A7C8A6" />
      <path
        d="m285 145 9-9m-7 26 13-1M98 137l-11-6"
        stroke="#B0D0AC"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M281 44q-30-30-52-2" stroke="#A8C8A1" strokeWidth="2" />
      <path d="m229 42 2-9m-2 9 9-1" stroke="#A8C8A1" strokeWidth="2" />
    </svg>
  );
}
export function SubjectArt({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 240 140" fill="none" aria-hidden="true">
      <circle cx="186" cy="22" r="56" fill="currentColor" opacity=".06" />
      <circle cx="34" cy="136" r="58" fill="currentColor" opacity=".05" />
      {kind === 'math' ? (
        <>
          <path
            d="m76 83 20-47h11l21 47m-44-13h35"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M137 52h35m-35 14h35" stroke="currentColor" strokeWidth="3" />
          <text
            x="150"
            y="106"
            fill="currentColor"
            fontFamily="serif"
            fontStyle="italic"
            fontSize="25"
          >
            x² + y²
          </text>
          <path d="m45 36 4-7 4 7 8 2-6 6 1 8-7-4-7 4 2-8-6-6Z" fill="currentColor" opacity=".35" />
        </>
      ) : kind === 'atom' ? (
        <>
          <ellipse cx="122" cy="70" rx="56" ry="20" stroke="currentColor" strokeWidth="2.5" />
          <ellipse
            cx="122"
            cy="70"
            rx="56"
            ry="20"
            transform="rotate(60 122 70)"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <ellipse
            cx="122"
            cy="70"
            rx="56"
            ry="20"
            transform="rotate(120 122 70)"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <circle cx="122" cy="70" r="8" fill="currentColor" />
          <circle cx="171" cy="60" r="5" fill="currentColor" />
          <circle cx="100" cy="28" r="5" fill="currentColor" />
        </>
      ) : kind === 'leaf' ? (
        <>
          <path d="M88 108c-30-71 33-76 67-83 7 39 12 88-59 77" fill="currentColor" opacity=".2" />
          <path
            d="m90 111 53-71m-42 54-10-30m24 12 29-3m-14-18-3-17"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : kind === 'language' ? (
        <>
          <text x="71" y="85" fill="currentColor" fontSize="55" fontFamily="serif">
            Aa
          </text>
          <path d="M73 98h95" stroke="currentColor" strokeWidth="3" />
          <circle cx="180" cy="39" r="13" stroke="currentColor" strokeWidth="2" />
          <path d="m175 39 4 4 7-8" stroke="currentColor" strokeWidth="2" />
        </>
      ) : (
        <>
          <path
            d="M70 44q26-8 50 4 24-12 50-4v55q-26-8-50 4-24-12-50-4Z"
            fill="currentColor"
            opacity=".15"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M120 48v55m-38-44 25 5m-25 9 25 5m25-14 25-5m-25 19 25-5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
      <circle cx="193" cy="102" r="4" fill="currentColor" opacity=".4" />
      <path d="M47 87h10m-5-5v10" stroke="currentColor" strokeWidth="2" opacity=".5" />
    </svg>
  );
}
