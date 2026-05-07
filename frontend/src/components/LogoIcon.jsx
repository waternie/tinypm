const LogoIcon = ({ size = 32, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={style}
  >
    <circle cx="8.5" cy="9" r="3" fill="#F97316" />
    <path d="M7 24V14.5" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M16 24V10" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M25 24V6.5" stroke="#38BDF8" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M8.5 9L16 10L25 6.5" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default LogoIcon;
