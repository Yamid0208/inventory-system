import { Component, signal, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private http = inject(HttpClient);

  readonly title = signal('Sistema de Gestión de Inventario (SGI)');
  readonly backendStatus = signal<'checking' | 'connected' | 'disconnected'>('checking');
  readonly apiData = signal<{ status?: string; timestamp?: string; service?: string } | null>(null);

  ngOnInit(): void {
    this.checkApiHealth();
  }

  checkApiHealth(): void {
    this.backendStatus.set('checking');
    this.http.get<{ status?: string; timestamp?: string; service?: string }>('/api/v1/health').subscribe({
      next: (data) => {
        this.backendStatus.set('connected');
        this.apiData.set(data);
      },
      error: () => {
        this.backendStatus.set('disconnected');
      }
    });
  }
}
