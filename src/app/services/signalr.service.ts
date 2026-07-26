import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Stock } from '../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | undefined;
  public stocksSignal = signal<Stock[]>([]);
  private readonly hubUrl = 'https://localhost:7030/stockHub';

  constructor() {}

  public startConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => console.log('SignalR Connection Started'))
      .catch(err => console.error('Error while starting SignalR connection: ' + err));
      
    this.addReceiveStocksListener();
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR Connection Stopped'))
        .catch(err => console.error('Error while stopping SignalR connection: ' + err));
    }
  }

  private addReceiveStocksListener(): void {
    if (!this.hubConnection) return;
    this.hubConnection.on('ReceiveStocks', (data: Stock[]) => {
      this.stocksSignal.set(data);
    });
  }
}
