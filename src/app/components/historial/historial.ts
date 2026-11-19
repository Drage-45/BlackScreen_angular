
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial implements OnInit {

  compras: any[] = [];

  busqueda: string = '';
  cargando: boolean = false;
  errorMensaje: string = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  // Consultar compras desde Spring Boot
  cargarHistorial(): void {

    this.cargando = true;
    this.errorMensaje = '';

    this.apiService.getCompras().subscribe({

      next: (data) => {
        this.compras = Array.isArray(data) ? data : [];
        this.cargando = false;
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Error al cargar historial:', error);

        this.errorMensaje =
          error.error?.mensaje ||
          'No se pudo cargar el historial de ventas.';

        this.cargando = false;
        this.cdr.detectChanges();
      }

    });
  }

  // Compras registradas
  get totalCompras(): number {
    return this.compras.length;
  }

  // Cantidad total de boletos vendidos
  get totalBoletos(): number {

    return this.compras.reduce(
      (total, compra) =>
        total + Number(compra.cantidadBoletos || 0),
      0
    );
  }

  // Recaudo total
  get totalRecaudado(): number {

    return this.compras.reduce(
      (total, compra) =>
        total + this.obtenerTotal(compra),
      0
    );
  }

  // Compatibilidad con la respuesta de Compra.java
  obtenerTotal(compra: any): number {
    return Number(
      compra.valorTotal ?? compra.total ?? 0
    );
  }

  // Filtrar compras por cliente, película o ticket
  get comprasFiltradas(): any[] {

    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) {
      return this.compras;
    }

    return this.compras.filter(compra => {

      const id = String(compra.id ?? '');
      const cliente = String(
        compra.nombreCliente ?? ''
      ).toLowerCase();

      const pelicula = String(
        compra.funcion?.pelicula?.titulo ?? ''
      ).toLowerCase();

      return (
        id.includes(texto.replace(/^#/, '')) ||
        cliente.includes(texto) ||
        pelicula.includes(texto)
      );

    });
  }

  // Limpiar búsqueda
  limpiarBusqueda(): void {
    this.busqueda = '';
  }
}
