"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAddress } from '@/app/utils/dataProcessing';
import { useState, useCallback } from 'react';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#999">
        {`${value} Attackers`}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
        {`(Rate ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

export function TopAttackersChart({ data }: { data: any[] }) {
  const chartData = data
    .sort((a, b) => b.small_transfers_count - a.small_transfers_count)
    .slice(0, 10)
    .map(attacker => ({
      address: formatAddress(attacker.address),
      transfers: attacker.small_transfers_count,
      victims: attacker.unique_victims_count,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 Attackers by Transfers</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)"/>
            <XAxis dataKey="address" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              labelStyle={{ color: '#ffffff' }}
            />
            <Legend wrapperStyle={{ color: '#ffffff' }}/>
            <Bar dataKey="transfers" fill="#8884d8" name="Transfers" />
            <Bar dataKey="victims" fill="#82ca9d" name="Victims" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RiskScoreDistributionChart({ data }: { data: any[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, [setActiveIndex]);

  const riskData = data.reduce((acc, attacker) => {
    const score = attacker.risk_score;
    if (score >= 0.9) acc.highRisk++;
    else if (score >= 0.7) acc.mediumRisk++;
    else acc.lowRisk++;
    return acc;
  }, { highRisk: 0, mediumRisk: 0, lowRisk: 0 });

  const chartData = [
    { name: 'High Risk', value: riskData.highRisk, color: '#ff4d4d' },
    { name: 'Medium Risk', value: riskData.mediumRisk, color: '#ffc658' },
    { name: 'Low Risk', value: riskData.lowRisk, color: '#82ca9d' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              labelStyle={{ color: '#ffffff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
