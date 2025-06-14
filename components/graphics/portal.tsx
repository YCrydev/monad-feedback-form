import { CSSProperties } from "react";

interface PortalProps {
  style?: CSSProperties;
  className?: string;
}

const Portal = ({ style, className }: PortalProps) => {
  return (
    <div style={style} className={className}>
      <svg
        width="400"
        height="300"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto" }}
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="portalGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#6366F1" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        
        {/* Portal rings */}
        <circle
          cx="200"
          cy="150"
          r="120"
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="3"
          opacity="0.7"
        />
        <circle
          cx="200"
          cy="150"
          r="90"
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="2"
          opacity="0.8"
        />
        <circle
          cx="200"
          cy="150"
          r="60"
          fill="none"
          stroke="url(#ringGradient)"
          strokeWidth="2"
          opacity="0.9"
        />
        
        {/* Central portal */}
        <circle
          cx="200"
          cy="150"
          r="40"
          fill="url(#portalGradient)"
        />
        
        {/* Swirling effect */}
        <path
          d="M200,110 Q220,130 200,150 Q180,170 200,190 Q220,170 200,150 Q180,130 200,110"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          opacity="0.6"
        />
        <path
          d="M230,150 Q210,130 190,150 Q210,170 230,150 Q210,130 190,150"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          opacity="0.5"
        />
        
        {/* Particles */}
        <circle cx="160" cy="120" r="2" fill="#F59E0B" opacity="0.8" />
        <circle cx="240" cy="130" r="1.5" fill="#EF4444" opacity="0.7" />
        <circle cx="170" cy="180" r="2.5" fill="#8B5CF6" opacity="0.9" />
        <circle cx="230" cy="170" r="1" fill="#3B82F6" opacity="0.6" />
        <circle cx="150" cy="150" r="1.5" fill="#F59E0B" opacity="0.8" />
        <circle cx="250" cy="150" r="2" fill="#EF4444" opacity="0.7" />
      </svg>
    </div>
  );
};

export default Portal; 