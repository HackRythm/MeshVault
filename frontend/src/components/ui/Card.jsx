export default function Card({ children, className = '', hover = true, onClick, padding = 'p-5' }) {
  return (
    <div
      className={`
        bg-surface border border-border rounded-xl ${padding}
        backdrop-blur-sm transition-all duration-300
        ${hover ? 'hover:border-accent/30 hover:shadow-glow hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
