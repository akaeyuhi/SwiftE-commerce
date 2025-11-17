interface ProgressBarProps {
  label: string;
  value: number; // 0-100
  color?: 'green' | 'blue' | 'orange' | 'red' | 'yellow' | 'gray';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  label,
  value,
  color = 'blue',
  showLabel = true,
  className = '',
}: ProgressBarProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'blue':
        return 'bg-blue-500';
      case 'orange':
        return 'bg-orange-500';
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-white">{value}%</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClasses(color)} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-400">
          {value < 25
            ? 'Low'
            : value < 50
              ? 'Medium'
              : value < 75
                ? 'High'
                : 'Critical'}
        </p>
      )}
    </div>
  );
}
