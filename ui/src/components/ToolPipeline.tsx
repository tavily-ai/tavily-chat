import React from 'react';
import { CheckCircle2, LoaderCircle, ArrowRight } from 'lucide-react';

interface ToolStep {
  type: 'search' | 'extract' | 'crawl';
  status: 'pending' | 'active' | 'completed';
  count?: number;
  details?: string[];
}

interface ToolPipelineProps {
  steps: ToolStep[];
  currentStep?: number;
}

const ToolPipeline: React.FC<ToolPipelineProps> = ({ steps }) => {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'active':
        return <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepLabel = (type: string) => {
    switch (type) {
      case 'search':
        return 'Search';
      case 'extract':
        return 'Extract';
      case 'crawl':
        return 'Crawl';
      default:
        return type;
    }
  };

  if (steps.length <= 1) return null;

  return (
    <div className="flex items-center space-x-2 py-2 px-3 bg-gray-50 rounded-lg mb-2">
      <div className="text-xs font-medium text-gray-600">Pipeline:</div>
      <div className="flex items-center space-x-2">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex items-center space-x-1">
              {getStepIcon(step.status)}
              <span className={`text-xs font-medium ${
                step.status === 'completed' ? 'text-green-600' :
                step.status === 'active' ? 'text-blue-600' :
                'text-gray-400'
              }`}>
                {getStepLabel(step.type)}
                {step.count && step.count > 1 && (
                  <span className="ml-1 text-gray-500">({step.count})</span>
                )}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-gray-400" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ToolPipeline; 