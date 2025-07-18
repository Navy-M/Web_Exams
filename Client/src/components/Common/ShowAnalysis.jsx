import React from 'react';

import MbtiAnalysis from './analysis/MbtiAnalysis';
import DiscAnalysis from './analysis/DiscAnalysis';
import HollandAnalysis from './analysis/HollandAnalysis';
import GardnerAnalysis from './analysis/GardnerAnalysis';
import CliftonStrengthsAnalysis from './analysis/CliftonStrengthsAnalysis';

const ShowAnalysis = ({ testType, analysisData }) => {
  const renderAnalysisComponent = (type, data) => {
    switch (type) {
      case 'MBTI':
        return <MbtiAnalysis data={data} />;
      case 'DISC':
        return <DiscAnalysis data={data} />;
      case 'HOLLAND':
        return <HollandAnalysis data={data} />;
      case 'GARDNER':
        return <GardnerAnalysis data={data} />;
      case 'CLIFTON':
        return <CliftonStrengthsAnalysis data={data} />;
      default:
        return <div>نوع تحلیل مشخص نیست</div>;
    }
  };

  return <div>{renderAnalysisComponent(testType, analysisData)}</div>;
};

export default ShowAnalysis;
