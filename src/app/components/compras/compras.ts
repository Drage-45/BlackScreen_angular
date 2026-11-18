import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compras.html',
  styleUrl: './compras.css'
})
export class Compras implements OnInit {
  peliculasConFunciones: any[] = [];
  funciones: any[] = [];


  modalAbierto: boolean = false;
  peliculaSeleccionada: any = null;
  urlTrailerSegura: SafeResourceUrl | null = null;

  compraActual: { funcionId: any; cantidadBoletos: number | null } = {
    funcionId: '',
    cantidadBoletos: 1
  };


  boletoGenerado: any = null;

  toastMensaje: string = '';
  toastError: boolean = false;
  private toastTimeout: any = null;

  private readonly gradientes: [string, string][] = [
    ['#2b1b5e', '#7c4dff'],
    ['#10163a', '#5a6bd8'],
    ['#14121c', '#4a3a78'],
    ['#4a2340', '#c2497f'],
    ['#1d2a3a', '#7a52c7'],
    ['#3a1330', '#9b3f9f'],
    ['#0e1a1a', '#5b34c9']
  ];

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.cargarCartelera();
  }

  cargarCartelera(): void {
    this.apiService.getPeliculas().subscribe(peliculas => {
      this.apiService.getFunciones().subscribe(funciones => {
        this.funciones = funciones;

        this.peliculasConFunciones = peliculas.map((peli: any, idx: number) => {
          const colores = this.gradientes[idx % this.gradientes.length];
          const funcionesPeli = funciones.filter((f: any) => f.pelicula?.id === peli.id);
          return {
            ...peli,
            colores,
            funciones: funcionesPeli
          };
        });

        if (this.peliculaSeleccionada) {
          const actualizada = this.peliculasConFunciones.find(p => p.id === this.peliculaSeleccionada.id);
          if (actualizada) {
            this.peliculaSeleccionada = actualizada;
          }
        }

        this.cdr.detectChanges();
      });
    });
  }

  obtenerEstiloPoster(pelicula: any): string {
    const c0 = pelicula.colores?.[0] || '#2b1b5e';
    const c1 = pelicula.colores?.[1] || '#7c4dff';
    if (pelicula.posterUrl && pelicula.posterUrl.trim() !== '') {
      return `url('${pelicula.posterUrl}'), linear-gradient(160deg, ${c0}, ${c1})`;
    }
    return `linear-gradient(160deg, ${c0}, ${c1})`;
  }

  abrirModal(pelicula: any): void {
    this.peliculaSeleccionada = pelicula;
    this.urlTrailerSegura = this.sanitizarTrailer(pelicula.trailerUrl);
    this.boletoGenerado = null;

    const primeraDisponible = pelicula.funciones?.find((f: any) => f.cuposDisponibles > 0);
    this.compraActual = {
      funcionId: primeraDisponible ? primeraDisponible.id : '',
      cantidadBoletos: 1
    };

    this.modalAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.peliculaSeleccionada = null;
    this.urlTrailerSegura = null;
    this.boletoGenerado = null;
  }

  get funcionSeleccionada(): any {
    if (!this.peliculaSeleccionada || !this.compraActual.funcionId) {
      return null;
    }
    return this.peliculaSeleccionada.funciones?.find(
      (f: any) => f.id === this.compraActual.funcionId
    );
  }

  get totalAPagar(): number {
    const func = this.funcionSeleccionada;
    const cant = this.compraActual.cantidadBoletos || 0;
    return func && cant > 0 ? func.precio * cant : 0;
  }

  realizarCompra(): void {
    const func = this.funcionSeleccionada;
    if (!func || !this.compraActual.cantidadBoletos || this.compraActual.cantidadBoletos < 1) {
      this.mostrarToast('Selecciona una función válida y la cantidad de boletos.', true);
      return;
    }

    const payload = {
      funcion: { id: func.id },
      cantidadBoletos: this.compraActual.cantidadBoletos,
      nombreCliente: 'Cliente Taquilla'
    };

    this.apiService.crearCompra(payload).subscribe({
      next: (compraCreada) => {
        this.boletoGenerado = {
          id: compraCreada?.id || Math.floor(1000 + Math.random() * 9000),
          codigo: `BS-${compraCreada?.id || Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          peliculaTitulo: this.peliculaSeleccionada.titulo,
          sala: func.sala,
          fecha: func.fecha,
          hora: func.hora,
          cantidadBoletos: payload.cantidadBoletos,
          total: compraCreada?.valorTotal ?? compraCreada?.total ?? this.totalAPagar
        };

        this.mostrarToast('¡Compra realizada con éxito!', false);
        this.cargarCartelera();
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (err.status === 409) {
          this.mostrarToast('Error 409: No hay suficientes cupos disponibles para esta función.', true);
        } else {
          this.mostrarToast('Ocurrió un error al procesar la compra en el servidor.', true);
        }
        this.cdr.detectChanges();
      }
    });
  }

  imprimirBoleto(): void {
    window.print();
  }

  mostrarToast(mensaje: string, esError: boolean = false): void {
    this.toastMensaje = mensaje;
    this.toastError = esError;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMensaje = '';
      this.cdr.detectChanges();
    }, 3500);
  }

  private sanitizarTrailer(trailer: string | null | undefined): SafeResourceUrl | null {
    if (!trailer || !trailer.trim()) {
      return null;
    }

    const raw = trailer.trim();
    let embedUrl = raw;

    // Soporta ID directo de YouTube (11 caracteres), enlace watch?v=, youtu.be/ o enlace /embed/
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
      embedUrl = `https://www.youtube.com/embed/${raw}`;
    } else {
      const match = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }
}
