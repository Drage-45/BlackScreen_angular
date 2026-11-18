import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-peliculas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './peliculas.html',
  styleUrl: './peliculas.css'
})
export class PeliculasComponent implements OnInit {
  peliculas: any[] = [];
  peliculaActual: any = {
    titulo: '',
    genero: '',
    duracion: null,
    clasificacion: '',
    posterUrl: '',
    trailerUrl: '',
    sinopsis: ''
  };
  editando: boolean = false;

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarPeliculas();
  }

  cargarPeliculas(): void {
    this.apiService.getPeliculas().subscribe(data => {
      this.peliculas = data;
      this.cdr.detectChanges();
    });
  }

  guardarPelicula(): void {
    if (this.editando) {
      this.apiService.actualizarPelicula(this.peliculaActual.id, this.peliculaActual).subscribe(() => {
        this.cargarPeliculas();
        this.resetForm();
      });
    } else {
      this.apiService.crearPelicula(this.peliculaActual).subscribe(() => {
        this.cargarPeliculas();
        this.resetForm();
      });
    }
  }

  editar(pelicula: any): void {
    this.peliculaActual = { ...pelicula };
    this.editando = true;
  }

  eliminar(id: number): void {
    this.apiService.eliminarPelicula(id).subscribe(() => {
      this.cargarPeliculas();
    });
  }

  resetForm(): void {
    this.peliculaActual = {
      titulo: '',
      genero: '',
      duracion: null,
      clasificacion: '',
      posterUrl: '',
      trailerUrl: '',
      sinopsis: ''
    };
    this.editando = false;
  }
}
