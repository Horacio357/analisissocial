"use client";

import React, { useState, useEffect } from 'react';

const mockFinanceData = [
  { symbol: "DÓLAR BLUE", value: "$1.400,00", change: "+1.2%", trend: "up" },
  { symbol: "RIESGO PAÍS", value: "1.450 pts", change: "-2.1%", trend: "down" },
  { symbol: "MERVAL", value: "1.250.000", change: "+0.5%", trend: "up" },
  { symbol: "BITCOIN", value: "US$ 64.200", change: "-1.8%", trend: "down" },
  { symbol: "INFLACIÓN (EST.)", value: "4.5%", change: "0.0%", trend: "neutral" },
];

export default function FinanceTicker() {
  const [items, setItems] = useState(mockFinanceData);

  useEffect(() => {
    // Simulamos una actualización en tiempo real cada 30 segundos
    const interval = setInterval(() => {
      setItems(prev => prev.map(item => ({
        ...item,
        value: item.symbol === "DÓLAR BLUE" ? `$1.40${Math.floor(Math.random() * 10)},00` : item.value,
        change: `${(Math.random() * 3 - 1.5).toFixed(1)}%`,
        trend: Math.random() > 0.5 ? "up" : "down"
      })));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 text-xs sm:text-sm font-mono flex overflow-hidden whitespace-nowrap h-8 items-center text-slate-300">
      <div className="animate-ticker flex space-x-12 px-4 shrink-0">
        {[...items, ...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">{item.symbol}</span>
            <span>{item.value}</span>
            <span className={
              item.trend === 'up' ? 'text-emerald-400' :
              item.trend === 'down' ? 'text-red-400' : 'text-slate-400'
            }>
              {item.change}
              {item.trend === 'up' ? ' ▲' : item.trend === 'down' ? ' ▼' : ' ▬'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
