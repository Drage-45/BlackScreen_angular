
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  peliculas: any[] = [];
  funciones: any[] = [];
  compras: any[] = [];

  cargando = false;
  errorMensaje = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando = true;
    this.errorMensaje = '';

    forkJoin({
      peliculas: this.apiService.getPeliculas(),
      funciones: this.apiService.getFunciones(),
      compras: this.apiService.getCompras()
    }).subscribe({
      next: ({ peliculas, funciones, compras }) => {
        this.peliculas = Array.isArray(peliculas) ? peliculas : [];
        this.funciones = Array.isArray(funciones) ? funciones : [];
        this.compras = Array.isArray(compras) ? compras : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar Dashboard:', error);

        this.errorMensaje =
          error.error?.mensaje ||
          'No se pudieron cargar las estadísticas del cine.';

        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get totalPeliculas(): number {
    return this.peliculas.length;
  }

  get totalFunciones(): number {
    return this.funciones.length;
  }

  get totalBoletos(): number {
    return this.compras.reduce(
      (total, compra) =>
        total + Number(compra.cantidadBoletos ?? 0),
      0
    );
  }

  get totalIngresos(): number {
    return this.compras.reduce(
      (total, compra) =>
        total + Number(compra.valorTotal ?? compra.total ?? 0),
      0
    );
  }

  // Últimas cinco compras por fecha e ID
  get ultimasCompras(): any[] {
    return [...this.compras]
      .sort((a, b) => {
        const fechaA = a.fechaCompra || '';
        const fechaB = b.fechaCompra || '';
        const comparacion = fechaB.localeCompare(fechaA);

        return comparacion !== 0
          ? comparacion
          : Number(b.id ?? 0) - Number(a.id ?? 0);
      })
      .slice(0, 5);
  }
}
