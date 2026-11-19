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
    duracion: '',
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

    const pelicula = {
      titulo: this.peliculaActual.titulo,
      genero: this.peliculaActual.genero,
      duracion: this.peliculaActual.duracion,
      clasificacion: this.peliculaActual.clasificacion,
      sinopsis: this.peliculaActual.sinopsis?.trim() || null,
      posterUrl: this.peliculaActual.posterUrl?.trim() || null,
      trailerUrl: this.peliculaActual.trailerUrl?.trim() || null
    };

    if (this.editando) {

      this.apiService
        .actualizarPelicula(this.peliculaActual.id, pelicula)
        .subscribe({
          next: () => {
            this.cargarPeliculas();
            this.resetForm();
          },
          error: (error) => {
            console.error('Error al actualizar película:', error);
            alert(error.error?.mensaje || 'No se pudo actualizar la película');
          }
        });

    } else {

      this.apiService
        .crearPelicula(pelicula)
        .subscribe({
          next: () => {
            this.cargarPeliculas();
            this.resetForm();
          },
          error: (error) => {
            console.error('Error al registrar película:', error);
            alert(error.error?.mensaje || 'No se pudo registrar la película');
          }
        });

    }
  }

  editar(pelicula: any): void {
    this.peliculaActual = { ...pelicula };
    this.editando = true;
  }

  eliminar(id: number): void {

  if (!confirm('¿Estás seguro de eliminar esta película?')) {
    return;
  }

  this.apiService.eliminarPelicula(id).subscribe({
    next: () => {
      alert('Película eliminada correctamente');
      this.cargarPeliculas();
    },
    error: (error) => {
      alert(error.error?.mensaje || 'Error al eliminar la película');
      console.error(error);
    }
  });
}

  resetForm(): void {
    this.peliculaActual = {
      titulo: '',
      genero: '',
      duracion: '',
      clasificacion: '',
      posterUrl: '',
      trailerUrl: '',
      sinopsis: ''
    };
    this.editando = false;
  }
}
