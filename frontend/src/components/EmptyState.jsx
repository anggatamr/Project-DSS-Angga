import React from 'react';

const ChartIllustration = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
    <rect x="10" y="50" width="16" height="40" rx="4" fill="#EADCD3" />
    <rect x="32" y="30" width="16" height="60" rx="4" fill="#D37B55" opacity="0.4" />
    <rect x="54" y="20" width="16" height="70" rx="4" fill="#D37B55" opacity="0.6" />
    <rect x="76" y="40" width="16" height="50" rx="4" fill="#D37B55" opacity="0.3" />
    <rect x="98" y="10" width="16" height="80" rx="4" fill="#D37B55" opacity="0.8" />
    <line x1="5" y1="92" x2="118" y2="92" stroke="#EFEAE2" strokeWidth="2" strokeLinecap="round" />
    <circle cx="95" cy="15" r="8" fill="#7A9D54" opacity="0.3" />
    <path d="M92 15 L94 17 L98 13" stroke="#7A9D54" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TableIllustration = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
    <rect x="10" y="10" width="100" height="16" rx="4" fill="#EADCD3" />
    <rect x="10" y="32" width="40" height="12" rx="3" fill="#EFEAE2" />
    <rect x="55" y="32" width="55" height="12" rx="3" fill="#EFEAE2" />
    <rect x="10" y="50" width="40" height="12" rx="3" fill="#FAF6F0" />
    <rect x="55" y="50" width="55" height="12" rx="3" fill="#FAF6F0" />
    <rect x="10" y="68" width="40" height="12" rx="3" fill="#EFEAE2" />
    <rect x="55" y="68" width="55" height="12" rx="3" fill="#EFEAE2" />
    <circle cx="100" cy="85" r="10" fill="#D37B55" opacity="0.15" />
    <path d="M97 85 L100 88 L103 82" stroke="#D37B55" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
  </svg>
);

const SearchIllustration = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
    <circle cx="52" cy="45" r="25" stroke="#EADCD3" strokeWidth="3" fill="none" />
    <circle cx="52" cy="45" r="18" stroke="#D37B55" strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.4" />
    <line x1="70" y1="63" x2="90" y2="83" stroke="#EADCD3" strokeWidth="4" strokeLinecap="round" />
    <line x1="72" y1="65" x2="88" y2="81" stroke="#D37B55" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    <circle cx="45" cy="40" r="3" fill="#D37B55" opacity="0.2" />
    <circle cx="58" cy="38" r="2" fill="#D37B55" opacity="0.3" />
    <circle cx="50" cy="52" r="2.5" fill="#D37B55" opacity="0.15" />
  </svg>
);

const RadarIllustration = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
    <polygon points="60,15 95,35 85,75 35,75 25,35" fill="none" stroke="#EFEAE2" strokeWidth="1.5" />
    <polygon points="60,25 85,38 78,68 42,68 35,38" fill="none" stroke="#EFEAE2" strokeWidth="1" strokeDasharray="3 3" />
    <polygon points="60,35 75,43 71,61 49,61 45,43" fill="#D37B55" stroke="#D37B55" strokeWidth="1.5" opacity="0.4" />
    <line x1="60" y1="50" x2="60" y2="15" stroke="#EFEAE2" strokeWidth="1" />
    <line x1="60" y1="50" x2="95" y2="35" stroke="#EFEAE2" strokeWidth="1" />
    <line x1="60" y1="50" x2="85" y2="75" stroke="#EFEAE2" strokeWidth="1" />
    <line x1="60" y1="50" x2="35" y2="75" stroke="#EFEAE2" strokeWidth="1" />
    <line x1="60" y1="50" x2="25" y2="35" stroke="#EFEAE2" strokeWidth="1" />
    <circle cx="60" cy="35" r="3" fill="#D37B55" opacity="0.5" />
    <circle cx="75" cy="43" r="3" fill="#D37B55" opacity="0.5" />
    <circle cx="71" cy="61" r="3" fill="#D37B55" opacity="0.5" />
  </svg>
);

const illustrationMap = {
  chart: ChartIllustration,
  table: TableIllustration,
  search: SearchIllustration,
  radar: RadarIllustration
};

const EmptyState = ({ 
  icon = 'chart', 
  title = 'Belum ada data', 
  subtitle = 'Data akan muncul setelah Anda melakukan perhitungan.',
  action = null
}) => {
  const Illustration = illustrationMap[icon] || ChartIllustration;

  return (
    <div className="empty-state">
      <div className="empty-state-illustration">
        <Illustration />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-subtitle">{subtitle}</p>
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
