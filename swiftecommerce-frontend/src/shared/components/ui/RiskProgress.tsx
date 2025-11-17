import { Progress } from '@/shared/components/ui/Progress';
import { cn } from '@/shared/utils/cn.ts';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskProgressProps {
  riskLevel: RiskLevel;
  percentage: number;
  showLabel?: boolean;
  className?: string;
}

export function RiskProgress({
  riskLevel,
  percentage,
  showLabel = true,
  className,
}: RiskProgressProps) {
  const getRiskConfig = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return {
          color: 'bg-destructive',
          indicatorColor: 'bg-red-600',
          textColor: 'text-red-600',
          label: 'Critical Risk',
        };
      case 'high':
        return {
          color: 'bg-orange-100',
          indicatorColor: 'bg-orange-500',
          textColor: 'text-orange-600',
          label: 'High Risk',
        };
      case 'medium':
        return {
          color: 'bg-yellow-100',
          indicatorColor: 'bg-yellow-500',
          textColor: 'text-yellow-600',
          label: 'Medium Risk',
        };
      case 'low':
        return {
          color: 'bg-green-100',
          indicatorColor: 'bg-green-500',
          textColor: 'text-green-600',
          label: 'Low Risk',
        };
      default:
        return {
          color: 'bg-gray-100',
          indicatorColor: 'bg-gray-500',
          textColor: 'text-gray-600',
          label: 'Unknown',
        };
    }
  };

  const config = getRiskConfig(riskLevel);

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-sm">
          <span className={cn('font-medium', config.textColor)}>
            {config.label}
          </span>
          <span className="font-semibold">{percentage}%</span>
        </div>
      )}

      <Progress
        value={percentage}
        className={cn('h-2', config.color)}
        indicatorClassName={config.indicatorColor}
      />
    </div>
  );
}
