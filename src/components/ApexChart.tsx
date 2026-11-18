'use client';
import dynamic from 'next/dynamic';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ApexChartProps {
  type: 'line' | 'bar' | 'area' | 'donut' | 'pie';
  series: any[];
  options: any;
  height?: number;
  width?: string | number;
}

export default function ApexChart({
  type,
  series,
  options,
  height = 300,
  width = '100%',
}: ApexChartProps) {
  return (
    <ReactApexChart
      type={type}
      series={series}
      options={options}
      height={height}
      width={width}
    />
  );
}
