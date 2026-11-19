
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DomSanitizer,
  SafeResourceUrl
} from '@angular/platform-browser';

import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compras.html',
  styleUrl: './compras.css'
})
export class Compras implements OnInit, OnDestroy {

  peliculasConFunciones: any[] = [];
  funciones: any[] = [];

  modalAbierto = false;
  peliculaSeleccionada: any = null;
  urlTrailerSegura: SafeResourceUrl | null = null;

  compraActual: {
    funcionId: number | null;
    nombreCliente: string;
    cantidadBoletos: number | null;
  } = {
    funcionId: null,
    nombreCliente: '',
    cantidadBoletos: 1
  };

  boletoGenerado: any = null;

  compraEnProceso = false;

  toastMensaje = '';
  toastError = false;

  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

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

  ngOnDestroy(): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  cargarCartelera(): void {

    forkJoin({
      peliculas: this.apiService.getPeliculas(),
      funciones: this.apiService.getFunciones()
    }).subscribe({

      next: ({ peliculas, funciones }) => {

        this.funciones = funciones;

        this.peliculasConFunciones = peliculas.map(
          (peli: any, index: number) => {

            const colores =
              this.gradientes[index % this.gradientes.length];

            const funcionesPeli = funciones.filter(
              (funcion: any) =>
                funcion.pelicula?.id === peli.id
            );

            return {
              ...peli,
              colores,
              funciones: funcionesPeli
            };
          }
        );

        if (this.peliculaSeleccionada) {

          const actualizada = this.peliculasConFunciones.find(
            (p: any) => p.id === this.peliculaSeleccionada.id
          );

          if (actualizada) {
            this.peliculaSeleccionada = actualizada;
          }
        }

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Error al cargar cartelera:', error);

        this.mostrarToast(
          error.error?.mensaje ||
          'No se pudo cargar la cartelera.',
          true
        );
      }
    });
  }

  obtenerEstiloPoster(pelicula: any): string {

    const color1 = pelicula.colores?.[0] || '#2b1b5e';
    const color2 = pelicula.colores?.[1] || '#7c4dff';

    if (
      typeof pelicula.posterUrl === 'string' &&
      /^https?:\/\//i.test(pelicula.posterUrl.trim())
    ) {
      return `url("${pelicula.posterUrl}"),
        linear-gradient(160deg, ${color1}, ${color2})`;
    }

    return `linear-gradient(160deg, ${color1}, ${color2})`;
  }


  abrirModal(pelicula: any): void {

    this.peliculaSeleccionada = pelicula;

    this.urlTrailerSegura =
      this.sanitizarTrailer(pelicula.trailerUrl);

    this.boletoGenerado = null;
    this.compraEnProceso = false;

    const primeraDisponible = pelicula.funciones?.find(
      (funcion: any) => funcion.cuposDisponibles > 0
    );

    this.compraActual = {
      funcionId: primeraDisponible?.id ?? null,
      nombreCliente: '',
      cantidadBoletos: 1
    };

    this.modalAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {

    if (this.compraEnProceso) {
      return;
    }

    this.modalAbierto = false;
    this.peliculaSeleccionada = null;
    this.urlTrailerSegura = null;
    this.boletoGenerado = null;
  }

  get funcionSeleccionada(): any {

    if (
      !this.peliculaSeleccionada ||
      this.compraActual.funcionId == null
    ) {
      return null;
    }

    return this.peliculaSeleccionada.funciones?.find(
      (funcion: any) =>
        funcion.id === this.compraActual.funcionId
    ) ?? null;
  }

  get totalAPagar(): number {

    const funcion = this.funcionSeleccionada;
    const cantidad = this.compraActual.cantidadBoletos ?? 0;

    if (!funcion || cantidad <= 0) {
      return 0;
    }

    return funcion.precio * cantidad;
  }


  realizarCompra(): void {

    if (this.compraEnProceso) {
      return;
    }

    const funcion = this.funcionSeleccionada;
    const cantidad = this.compraActual.cantidadBoletos;
    const nombre = this.compraActual.nombreCliente.trim();

    if (!funcion) {
      this.mostrarToast(
        'Selecciona una función válida.',
        true
      );
      return;
    }

    if (!nombre) {
      this.mostrarToast(
        'El nombre del cliente es obligatorio.',
        true
      );
      return;
    }

    if (
      cantidad == null ||
      !Number.isInteger(cantidad) ||
      cantidad <= 0
    ) {
      this.mostrarToast(
        'La cantidad de boletos debe ser un entero mayor que cero.',
        true
      );
      return;
    }

    if (cantidad > funcion.cuposDisponibles) {
      this.mostrarToast(
        'No hay suficientes cupos disponibles.',
        true
      );
      return;
    }

    const payload = {
      funcion: {
        id: funcion.id
      },
      nombreCliente: nombre,
      cantidadBoletos: cantidad
    };

    this.compraEnProceso = true;

    this.apiService.crearCompra(payload).subscribe({

      next: (compraCreada) => {

        this.compraEnProceso = false;

        this.boletoGenerado = {
          id: compraCreada.id,
          codigo: `BS-${compraCreada.id}`,
          nombreCliente: nombre,
          peliculaTitulo: this.peliculaSeleccionada.titulo,
          sala: funcion.sala,
          fecha: funcion.fecha,
          hora: funcion.hora,
          cantidadBoletos: compraCreada.cantidadBoletos ?? cantidad,
          total: compraCreada.valorTotal ?? compraCreada.total
        };

        this.mostrarToast(
          '¡Compra registrada correctamente!'
        );

        this.cargarCartelera();
        this.cdr.detectChanges();
      },

      error: (error) => {

        this.compraEnProceso = false;

        console.error('Error al registrar compra:', error);

        let mensaje =
          error.error?.mensaje ||
          'No se pudo registrar la compra.';

        if (error.status === 409) {
          mensaje = error.error?.mensaje ||
            'No hay suficientes cupos disponibles.';
        }

        if (error.status === 404) {
          mensaje = error.error?.mensaje ||
            'La función seleccionada no existe.';
        }

        if (error.status === 0) {
          mensaje = 'No se pudo conectar con Spring Boot.';
        }

        this.mostrarToast(mensaje, true);

        if (error.status === 409 || error.status === 404) {
          this.cargarCartelera();
        }

        this.cdr.detectChanges();
      }
    });
  }

  imprimirBoleto(): void {
    window.print();
  }


  mostrarToast(
    mensaje: string,
    esError: boolean = false
  ): void {

    this.toastMensaje = mensaje;
    this.toastError = esError;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.cdr.detectChanges();

    this.toastTimeout = setTimeout(() => {

      this.toastMensaje = '';
      this.cdr.detectChanges();

    }, 3500);
  }


  private sanitizarTrailer(
    trailer: string | null | undefined
  ): SafeResourceUrl | null {

    if (!trailer?.trim()) {
      return null;
    }

    const valor = trailer.trim();
    let videoId: string | null = null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(valor)) {
      videoId = valor;
    } else {
      try {
        const url = new URL(valor);

        const host = url.hostname.toLowerCase();

        if (
          host === 'youtube.com' ||
          host === 'www.youtube.com' ||
          host === 'm.youtube.com'
        ) {
          if (url.pathname === '/watch') {
            videoId = url.searchParams.get('v');
          } else if (url.pathname.startsWith('/embed/')) {
            videoId = url.pathname.split('/')[2];
          }
        } else if (host === 'youtu.be') {
          videoId = url.pathname.slice(1).split('/')[0];
        }
      } catch {
        return null;
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`
    );
  }
}
