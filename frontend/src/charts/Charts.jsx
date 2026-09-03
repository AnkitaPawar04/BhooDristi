import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export const CropDistributionChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.crop),
    datasets: [
      {
        label: 'Prediction Count',
        data: data.map((item) => item.count),
        backgroundColor: [
          '#10b981',
          '#3b82f6',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899',
        ],
      },
    ],
  };

  return <Pie data={chartData} />;
};

export const FarmerActivityChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: 'New Farmers',
        data: data.map((item) => item.farmers),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  return <Line data={chartData} />;
};

export const DistrictCropChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.district),
    datasets: [
      {
        label: 'Prediction Count',
        data: data.map((item) => item.count),
        backgroundColor: '#10b981',
      },
    ],
  };

  return <Bar data={chartData} />;
};

export const TemperatureTrendChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.day),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: data.map((item) => item.temp),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return <Line data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />;
};

export const RainfallChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.day),
    datasets: [
      {
        label: 'Rainfall (mm)',
        data: data.map((item) => item.rainfall),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  return <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />;
};

export const SoilNutrientsChart = ({ data }) => {
  const chartData = {
    labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
    datasets: [
      {
        label: 'Nutrient Levels (mg/kg)',
        data: [data.nitrogen || 0, data.phosphorus || 0, data.potassium || 0],
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
      },
    ],
  };

  return <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />;
};

export const CropPerformanceChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.crop),
    datasets: [
      {
        label: 'Recommendation Count',
        data: data.map((item) => item.yield),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  return <Line data={chartData} options={{ responsive: true, maintainAspectRatio: true }} />;
};

export default { 
  CropDistributionChart, 
  FarmerActivityChart, 
  DistrictCropChart, 
  TemperatureTrendChart, 
  RainfallChart, 
  SoilNutrientsChart, 
  CropPerformanceChart 
};
