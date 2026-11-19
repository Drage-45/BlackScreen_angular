import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-funciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './funciones.html',
  styleUrl: './funciones.css'
})
export class Funciones implements OnInit {
  funciones: any[] = [];
  peliculas: any[] = [];

  funcionActual: any = { pelicula: { id: '' }, fecha: '', hora: '', sala: '', precio: null, cuposDisponibles: null };
  editando: boolean = false;

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarFunciones();
    this.cargarPeliculas();
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
