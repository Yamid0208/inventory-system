import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);

  ngOnInit(): void {
    // Restauración silenciosa de sesión vía HttpOnly cookie al cargar la aplicación
    this.authService.refresh().subscribe({
      error: () => {
        // Si la cookie no existe o expiró, el usuario permanece no autenticado
      }
    });
  }
}
