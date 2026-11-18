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
    this.apiService.getFunciones().subscribe(data => {
      this.funciones = data;
      this.cdr.detectChanges();
    });
  }

  cargarPeliculas(): void {
    this.apiService.getPeliculas().subscribe(data => {
      this.peliculas = data;
      this.cdr.detectChanges();
    });
  }

  guardarFuncion(): void {
    if (this.editando) {
      this.apiService.actualizarFuncion(this.funcionActual.id, this.funcionActual).subscribe(() => {
        this.cargarFunciones();
        this.resetForm();
      });
    } else {
      this.apiService.crearFuncion(this.funcionActual).subscribe(() => {
        this.cargarFunciones();
        this.resetForm();
      });
    }
  }

  editar(funcion: any): void {
    this.funcionActual = { ...funcion, pelicula: { id: funcion.pelicula.id } };
    this.editando = true;
  }

  eliminar(id: number): void {
    this.apiService.eliminarFuncion(id).subscribe(() => {
      this.cargarFunciones();
    });
  }

  resetForm(): void {
    this.funcionActual = { pelicula: { id: '' }, fecha: '', hora: '', sala: '', precio: null, cuposDisponibles: null };
    this.editando = false;
  }
}
