import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService, Butaca } from '../../services/api';

@Component({
  selector: 'app-funciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './funciones.html',
  styleUrl: './funciones.css'
})
export class Funciones implements OnInit, OnDestroy {
  funciones: any[] = [];
  peliculas: any[] = [];

  funcionActual: any = { pelicula: { id: '' }, fecha: '', hora: '', sala: '', precio: null, cuposDisponibles: null };
  editando: boolean = false;
  tituloMapa = '';
  filasMapa: { etiqueta: string; butacas: (Butaca & { columna: number })[] }[] = [];
  columnasMapa = 0;
  cargandoMapa = false;
  errorMapa = '';
  private consultaMapa?: Subscription;

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarFunciones();
    this.cargarPeliculas();
  }

  ngOnDestroy(): void {
    this.cerrarMapa();
  }

  verButacas(funcion: any, dialogo: HTMLDialogElement): void {
    this.cerrarMapa();
    this.tituloMapa = `Butacas · ${funcion.pelicula?.titulo ?? 'Función'} · Sala ${funcion.sala}`;
    this.filasMapa = [];
    this.columnasMapa = 0;
    this.errorMapa = '';
    this.cargandoMapa = true;
    dialogo.showModal();

    this.consultaMapa = this.apiService.getButacas(funcion.id).subscribe({
      next: (butacas) => {
        const filas = new Map<string, (Butaca & { columna: number })[]>();
        for (const butaca of butacas) {
          const etiqueta = butaca.codigo.replace(/[0-9]+$/, '');
          const columna = Number(butaca.codigo.slice(etiqueta.length));
          const fila = filas.get(etiqueta) ?? [];
          fila.push({ ...butaca, columna });
          filas.set(etiqueta, fila);
          this.columnasMapa = Math.max(this.columnasMapa, columna);
        }
        this.filasMapa = Array.from(filas, ([etiqueta, butacas]) => ({ etiqueta, butacas }));
        this.cargandoMapa = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMapa = error.error?.mensaje || 'No se pudieron consultar las butacas.';
        this.cargandoMapa = false;
        this.cdr.markForCheck();
      }
    });
  }

  cerrarMapa(): void {
    this.consultaMapa?.unsubscribe();
  }

  cargarFunciones(): void {
    this.apiService.getFunciones().subscribe({
      next: (data) => {
        this.funciones = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar funciones:', error);
        alert(error.error?.mensaje || 'No se pudieron cargar las funciones');
      }
    });
  }

  cargarPeliculas(): void {
    this.apiService.getPeliculas().subscribe({
      next: (data) => {
        this.peliculas = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar películas:', error);
        alert(error.error?.mensaje || 'No se pudieron cargar las películas');
      }
    });
  }

  guardarFuncion(): void {

    const datos = {
      pelicula: {
        id: this.funcionActual.pelicula.id
      },
      fecha: this.funcionActual.fecha,
      hora: this.funcionActual.hora,
      sala: this.funcionActual.sala,
      precio: this.funcionActual.precio,
      cuposDisponibles: this.funcionActual.cuposDisponibles
    };

    if (this.editando) {

      this.apiService.actualizarFuncion(
        this.funcionActual.id, datos
      ).subscribe({
        next: () => {
          alert('Función actualizada correctamente');
          this.cargarFunciones();
          this.resetForm();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al actualizar función:', error);
          alert(error.error?.mensaje || 'No se pudo actualizar la función');
        }
      });

    } else {

      this.apiService.crearFuncion(datos).subscribe({
        next: () => {
          alert('Función registrada correctamente');
          this.cargarFunciones();
          this.resetForm();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al registrar función:', error);
          alert(error.error?.mensaje || 'No se pudo registrar la función');
        }
      });

    }
  }

  editar(funcion: any): void {
    this.funcionActual = {
      ...funcion,
      pelicula: { id: funcion.pelicula?.id ?? null }
    };

    this.editando = true;
  }

  eliminar(id: number): void {

    if (!confirm(
      '¿Estás seguro de eliminar esta función? ' +
      'También podrían eliminarse las compras asociadas.'
    )) {
      return;
    }

    this.apiService.eliminarFuncion(id).subscribe({
      next: () => {
        alert('Función eliminada correctamente');
        this.cargarFunciones();
      },
      error: (error) => {
        console.error('Error al eliminar función:', error);
        alert(error.error?.mensaje || 'No se pudo eliminar la función');
      }
    });
  }

  resetForm(): void {
    this.funcionActual = {
      pelicula: { id: null },
      fecha: '',
      hora: '',
      sala: '',
      precio: null,
      cuposDisponibles: null
    };

    this.editando = false;
  }
}
