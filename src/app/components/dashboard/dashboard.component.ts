import { Component, OnInit, OnDestroy, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignalRService } from '../../services/signalr.service';
import { AuthService } from '../../services/auth.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-luxon';
// @ts-ignore
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';

Chart.register(...registerables, CandlestickController, CandlestickElement);

interface StockWithHistory {
  symbol: string;
  price: number;
  updatedAt: Date;
  previousPrice?: number;
  change?: number;
  percentChange?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-layout">
      <nav class="sidebar">
        <div class="brand">
          <h2>StockPro<span>.</span></h2>
        </div>
        <div class="user-info">
          <div class="avatar">{{ currentUser()?.charAt(0)?.toUpperCase() }}</div>
          <div class="name">
            <span class="greeting">Welcome back,</span>
            <span class="username">{{ currentUser() }}</span>
          </div>
        </div>
        <div class="nav-links">
          <a [class.active]="currentTab === 'dashboard'" (click)="currentTab = 'dashboard'"><i class="icon-dashboard"></i> Dashboard</a>
          <a [class.active]="currentTab === 'portfolio'" (click)="currentTab = 'portfolio'"><i class="icon-portfolio"></i> Portfolio</a>
          <a [class.active]="currentTab === 'analytics'" (click)="currentTab = 'analytics'"><i class="icon-analytics"></i> Analytics</a>
          <a [class.active]="currentTab === 'settings'" (click)="currentTab = 'settings'"><i class="icon-settings"></i> Settings</a>
        </div>
        
        <div class="market-status">
          <div class="status-title">Market Status</div>
          <div class="status-indicator">
            <span class="pulse"></span> Open
          </div>
          <div class="market-time">Session ends in 4h 12m</div>
        </div>

        <button class="logout-btn" (click)="logout()">
          Logout
        </button>
      </nav>
      
      <main class="main-content">
        <div [hidden]="currentTab !== 'dashboard'">
          <header class="topbar">
            <div>
              <h1 class="page-title">Live Market Overview</h1>
              <p class="subtitle">Real-time updates across all equity markets</p>
            </div>
            
            <div class="indices">
              <div class="index-card up">
                <span class="index-name">NIFTY 50</span>
                <span class="index-price">24,350.25</span>
                <span class="index-change">+120.40 (0.50%)</span>
              </div>
              <div class="index-card down">
                <span class="index-name">SENSEX</span>
                <span class="index-price">79,900.10</span>
                <span class="index-change">-85.20 (-0.11%)</span>
              </div>
            </div>
          </header>

          <div class="stocks-grid">
            <div class="stock-card" *ngFor="let stock of displayStocks" 
                 [class.selected-card]="selectedStockSymbol === stock.symbol"
                 (click)="selectStock(stock.symbol)">
              <div class="stock-header">
                <h3>{{ stock.symbol }}</h3>
                <div class="mini-chart" [ngClass]="(stock.change || 0) >= 0 ? 'up' : 'down'">
                  <i class="arrow" [ngClass]="(stock.change || 0) >= 0 ? 'arrow-up' : 'arrow-down'"></i>
                </div>
              </div>
              <div class="stock-price" [ngClass]="(stock.change || 0) >= 0 ? 'text-up' : 'text-down'">
                ₹{{ stock.price | number:'1.2-2' }}
              </div>
              <div class="stock-meta">
                <span class="change" [ngClass]="(stock.change || 0) >= 0 ? 'text-up' : 'text-down'">
                  {{ (stock.change || 0) > 0 ? '+' : '' }}{{ stock.change | number:'1.2-2' }} 
                  ({{ (stock.change || 0) > 0 ? '+' : '' }}{{ stock.percentChange | number:'1.2-2' }}%)
                </span>
                <span class="stock-time">{{ stock.updatedAt | date:'HH:mm:ss' }}</span>
              </div>
            </div>
          </div>

          <div class="chart-container">
            <div class="chart-header">
              <div>
                <h2>{{ selectedStockSymbol }} Live Chart</h2>
                <p>Real-time price tracking with zoomed volatility</p>
              </div>
              
              <div class="header-controls">
                <div class="style-toggle">
                  <button [class.active]="chartStyle === 'line'" (click)="setChartStyle('line')">Line</button>
                  <button [class.active]="chartStyle === 'candle'" (click)="setChartStyle('candle')">Candle</button>
                </div>
                
                <div class="timeframe-filters" *ngIf="selectedStockSymbol">
                  <button *ngFor="let tf of timeframes" 
                          [class.active]="selectedTimeframe === tf"
                          (click)="selectTimeframe(tf)">
                    {{ tf }}
                  </button>
                </div>
              </div>
            </div>
            <div class="canvas-wrapper">
              <canvas #stockChart></canvas>
            </div>
          </div>
        </div>

        <div *ngIf="currentTab === 'portfolio'" class="placeholder-tab">
          <h2>Your Portfolio</h2>
          <p>This section is under construction. Future updates will allow you to track your personal holdings here.</p>
          <div class="coming-soon-illustration">
            <div class="cube"></div>
          </div>
        </div>
        
        <div *ngIf="currentTab === 'analytics'" class="placeholder-tab">
          <h2>Deep Analytics</h2>
          <p>Advanced charting, RSI, MACD, and moving averages will be available here soon.</p>
        </div>
        
        <div *ngIf="currentTab === 'settings'" class="placeholder-tab">
          <h2>Account Settings</h2>
          <p>Manage your preferences, notification settings, and API keys.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      min-height: 100vh;
      background: #0f172a;
      color: #f8fafc;
      font-family: 'Inter', sans-serif;
    }
    
    .sidebar {
      width: 260px;
      background: #1e293b;
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      padding: 24px;
    }
    
    .brand h2 {
      font-size: 24px;
      margin: 0 0 32px 0;
      color: #fff;
    }
    
    .brand span {
      color: #3b82f6;
    }
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      margin-bottom: 32px;
    }
    
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
    }
    
    .name {
      display: flex;
      flex-direction: column;
    }
    
    .greeting {
      font-size: 12px;
      color: #94a3b8;
    }
    
    .username {
      font-weight: 600;
      font-size: 14px;
    }
    
    .nav-links {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .nav-links a {
      padding: 12px 16px;
      border-radius: 8px;
      color: #cbd5e1;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .nav-links a:hover {
      background: rgba(255,255,255,0.05);
      color: #fff;
    }
    
    .nav-links a.active {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      font-weight: 500;
      border-left: 3px solid #3b82f6;
    }
    
    .market-status {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    
    .status-title {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #34d399;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }
    
    .market-time {
      font-size: 12px;
      color: #64748b;
    }
    
    .pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse-animation 2s infinite;
    }
    
    @keyframes pulse-animation {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    
    .logout-btn {
      padding: 12px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }
    
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.2);
    }
    
    .main-content {
      flex: 1;
      padding: 32px 48px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      overflow-y: auto;
    }
    
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .page-title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }
    
    .subtitle {
      color: #94a3b8;
      margin: 0;
    }
    
    .indices {
      display: flex;
      gap: 16px;
    }
    
    .index-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 12px 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      min-width: 140px;
    }
    
    .index-name {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    
    .index-price {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .index-change {
      font-size: 13px;
      font-weight: 500;
    }
    
    .index-card.up .index-change { color: #34d399; }
    .index-card.down .index-change { color: #f87171; }
    
    .stocks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 24px;
    }
    
    .stock-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }
    
    .stock-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .stock-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      border-color: rgba(59, 130, 246, 0.3);
    }
    
    .stock-card.selected-card {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.05);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
    }
    
    .stock-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .stock-header h3 {
      margin: 0;
      color: #e2e8f0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .mini-chart {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .mini-chart.up { background: rgba(16, 185, 129, 0.1); }
    .mini-chart.down { background: rgba(239, 68, 68, 0.1); }
    
    .arrow {
      border: solid;
      border-width: 0 2px 2px 0;
      display: inline-block;
      padding: 3px;
    }
    
    .arrow-up {
      transform: rotate(-135deg);
      -webkit-transform: rotate(-135deg);
      border-color: #34d399;
      margin-top: 4px;
    }
    
    .arrow-down {
      transform: rotate(45deg);
      -webkit-transform: rotate(45deg);
      border-color: #f87171;
      margin-bottom: 4px;
    }
    
    .stock-price {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      transition: color 0.3s ease;
    }
    
    .text-up { color: #34d399; }
    .text-down { color: #f87171; }
    
    .stock-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .change {
      font-size: 14px;
      font-weight: 500;
    }
    
    .stock-time {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    
    .chart-container {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .chart-header {
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .chart-header h2 {
      margin: 0 0 4px 0;
      font-size: 20px;
    }
    
    .chart-header p {
      margin: 0;
      color: #94a3b8;
      font-size: 14px;
    }
    
    .timeframe-filters {
      display: flex;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      padding: 4px;
      gap: 2px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    
    .timeframe-filters button {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .timeframe-filters button:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }
    
    .timeframe-filters button.active {
      background: #3b82f6;
      color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .header-controls {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    
    .style-toggle {
      display: flex;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      padding: 4px;
      gap: 2px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    
    .style-toggle button {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .style-toggle button.active {
      background: #8b5cf6;
      color: #fff;
    }
    
    .canvas-wrapper {
      position: relative;
      flex: 1;
      min-height: 350px;
    }
    
    .placeholder-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 40px;
    }
    
    .placeholder-tab h2 {
      font-size: 24px;
      margin-bottom: 12px;
      color: #fff;
    }
    
    .placeholder-tab p {
      color: #94a3b8;
      max-width: 400px;
      line-height: 1.6;
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  currentUser = this.authService.currentUser;
  currentTab = 'dashboard';
  
  @ViewChild('stockChart') stockChartRef!: ElementRef;
  private chart: Chart | null = null;
  
  public displayStocks: StockWithHistory[] = [];
  public selectedStockSymbol: string = '';
  
  public timeframes = ['1m', '5m', '15m', '1H', '1D', '1W', '1M'];
  public selectedTimeframe = '1m';
  public chartStyle: 'line' | 'candle' = 'line';
  
  private historyLength = 40;
  private datasets: { [symbol: string]: any[] } = {};

  constructor(
    public signalRService: SignalRService,
    private authService: AuthService
  ) {
    effect(() => {
      const stocks = this.signalRService.stocksSignal();
      if (stocks.length > 0) {
        this.updateDisplayStocks(stocks);
        if (this.chart) {
          this.updateChart(stocks);
        }
      }
    });
  }

  ngOnInit() {
    this.signalRService.startConnection();
  }

  ngAfterViewInit() {
    this.initChart();
  }

  ngOnDestroy() {
    this.signalRService.stopConnection();
    if (this.chart) {
      this.chart.destroy();
    }
  }

  logout() {
    this.authService.logout();
  }
  
  private updateDisplayStocks(newStocks: any[]) {
    if (this.displayStocks.length === 0 && newStocks.length > 0) {
        this.selectedStockSymbol = newStocks[0].symbol;
    }

    newStocks.forEach(newStock => {
      const existing = this.displayStocks.find(s => s.symbol === newStock.symbol);
      if (existing) {
        existing.previousPrice = existing.price;
        existing.price = newStock.price;
        existing.updatedAt = newStock.updatedAt;
        existing.change = existing.price - existing.previousPrice;
        existing.percentChange = existing.previousPrice === 0 ? 0 : (existing.change / existing.previousPrice) * 100;
      } else {
        this.displayStocks.push({
          ...newStock,
          change: 0,
          percentChange: 0
        });
      }
    });
  }

  selectStock(symbol: string) {
    this.selectedStockSymbol = symbol;
    this.generateMockHistory();
    this.rebuildChartForSelectedStock();
  }

  selectTimeframe(tf: string) {
    this.selectedTimeframe = tf;
    this.generateMockHistory();
    this.rebuildChartForSelectedStock();
  }
  
  setChartStyle(style: 'line' | 'candle') {
    this.chartStyle = style;
    this.initChart();
    this.rebuildChartForSelectedStock();
  }

  private generateMockHistory() {
    if (!this.selectedStockSymbol) return;
    
    const currentStock = this.displayStocks.find(s => s.symbol === this.selectedStockSymbol);
    const basePrice = currentStock ? currentStock.price : 1000;
    
    this.datasets[this.selectedStockSymbol] = [];
    
    const now = new Date();
    let currentSimPrice = basePrice;
    
    const mockData = [];
    
    for (let i = this.historyLength; i >= 0; i--) {
      const volatility = basePrice * 0.005; 
      let stepDate = new Date(now);
      switch(this.selectedTimeframe) {
        case '1m': stepDate.setSeconds(stepDate.getSeconds() - (i * 2)); break;
        case '5m': stepDate.setSeconds(stepDate.getSeconds() - (i * 10)); break;
        case '15m': stepDate.setMinutes(stepDate.getMinutes() - (i * 1)); break;
        case '1H': stepDate.setMinutes(stepDate.getMinutes() - (i * 3)); break;
        case '1D': stepDate.setHours(stepDate.getHours() - (i * 1)); break;
        case '1W': stepDate.setHours(stepDate.getHours() - (i * 6)); break;
        case '1M': stepDate.setDate(stepDate.getDate() - i); break;
      }
      
      const open = currentSimPrice;
      const close = open + (Math.random() - 0.5) * volatility;
      
      mockData.push({
        x: stepDate.valueOf(),
        o: open,
        h: Math.max(open, close) + Math.random() * volatility,
        l: Math.min(open, close) - Math.random() * volatility,
        c: close,
        y: close
      });
      
      currentSimPrice = close;
    }
    
    this.datasets[this.selectedStockSymbol] = mockData;
  }
  
  private initChart() {
    if (this.chart) {
      this.chart.destroy();
    }
    const ctx = this.stockChartRef.nativeElement.getContext('2d');
    
    Chart.defaults.color = '#94a3b8';
    
    const glowPlugin = {
      id: 'glowPlugin',
      beforeDatasetsDraw: (chart: any) => {
        if (this.chartStyle !== 'line') return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      },
      afterDatasetsDraw: (chart: any) => {
        if (this.chartStyle === 'line') {
          chart.ctx.restore();
        }
      }
    };
    
    this.chart = new Chart(ctx, {
      type: this.chartStyle === 'candle' ? 'candlestick' : 'line',
      data: {
        datasets: []
      },
      plugins: [glowPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e2e8f0',
            borderColor: this.chartStyle === 'line' ? '#00f3ff' : 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true
          }
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'MMM d, yyyy HH:mm:ss' },
            grid: { color: 'rgba(0, 243, 255, 0.1)' },
            ticks: { maxTicksLimit: 10, color: '#64748b' }
          },
          y: {
            grid: { color: 'rgba(0, 243, 255, 0.1)' },
            ticks: { color: '#64748b' }
          }
        }
      }
    });
  }

  private rebuildChartForSelectedStock() {
    if (!this.chart || !this.selectedStockSymbol) return;
    const ctx = this.stockChartRef.nativeElement.getContext('2d');
    const data = this.datasets[this.selectedStockSymbol] || [];
    
    if (this.chartStyle === 'line') {
      const gradient = ctx.createLinearGradient(0, 0, 0, 350);
      gradient.addColorStop(0, 'rgba(0, 243, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(0, 243, 255, 0.0)');
      
      this.chart.data.datasets = [{
        label: this.selectedStockSymbol,
        data: [...data],
        borderColor: '#00f3ff', 
        backgroundColor: gradient,
        borderWidth: 3,
        tension: 0.1,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#00f3ff',
        pointHoverBorderWidth: 2
      }];
    } else {
      this.chart.data.datasets = [{
        label: this.selectedStockSymbol,
        data: [...data],
        color: { up: '#34d399', down: '#f87171', unchanged: '#94a3b8' },
        borderColor: { up: '#34d399', down: '#f87171', unchanged: '#94a3b8' },
        borderWidth: 1
      } as any];
    }
    this.chart.update();
  }

  private updateChart(stocks: any[]) {
    if (!this.chart) return;
    const activeStock = stocks.find(s => s.symbol === this.selectedStockSymbol);
    if (!activeStock) return;
    
    if (!this.datasets[activeStock.symbol]) {
      this.datasets[activeStock.symbol] = [];
    }
    const arr = this.datasets[activeStock.symbol];
    const now = new Date();
    let previousClose = arr.length > 0 ? arr[arr.length - 1].c : activeStock.price;
    const volatility = activeStock.price * 0.002;
    
    arr.push({
      x: now.valueOf(),
      o: previousClose,
      h: Math.max(previousClose, activeStock.price) + Math.random() * volatility,
      l: Math.min(previousClose, activeStock.price) - Math.random() * volatility,
      c: activeStock.price,
      y: activeStock.price
    });
    
    if (arr.length > this.historyLength) {
      arr.shift();
    }

    if (this.chart.data.datasets.length === 0 && this.selectedStockSymbol) {
      this.rebuildChartForSelectedStock();
      return;
    }

    if (this.selectedStockSymbol && this.chart.data.datasets.length > 0) {
      this.chart.data.datasets[0].data = [...arr];
      this.chart.update();
    }
  }
}
