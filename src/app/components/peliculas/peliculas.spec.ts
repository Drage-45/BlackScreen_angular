import { TestBed } from '@angular/core/testing';
import { EMPTY, of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api';
import { PeliculasComponent } from './peliculas';

describe('PeliculasComponent', () => {
  it('envía la ficha al crear y permite borrar campos opcionales al editar', async () => {
    const crearPelicula = vi.fn(() => of({}));
    const actualizarPelicula = vi.fn(() => of({}));
    await TestBed.configureTestingModule({
      imports: [PeliculasComponent],
      providers: [{
        provide: ApiService,
        useValue: { getPeliculas: () => EMPTY, crearPelicula, actualizarPelicula }
      }]
    }).compileComponents();

    const fixture = TestBed.createComponent(PeliculasComponent);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const ficha = {
      titulo: 'Prueba', genero: 'Drama', duracion: '90 min', clasificacion: 'TP',
      sinopsis: 'Una historia', posterUrl: 'https://example.com/poster.jpg',
      trailerUrl: 'https://youtu.be/abcdefghijk'
    };
    const dom: HTMLElement = fixture.nativeElement;
    expect(dom.querySelector('textarea#sinopsis')).not.toBeNull();
    expect(dom.querySelector('input#posterUrl')).not.toBeNull();
    expect(dom.querySelector('input#trailerUrl')).not.toBeNull();
    component.peliculaActual = { ...ficha };
    component.guardarPelicula();
    expect(crearPelicula).toHaveBeenCalledWith(ficha);

    component.editar({ id: 7, ...ficha });
    component.peliculaActual.posterUrl = '';
    component.guardarPelicula();
    expect(actualizarPelicula).toHaveBeenCalledWith(7, { ...ficha, posterUrl: null });
  });
});
