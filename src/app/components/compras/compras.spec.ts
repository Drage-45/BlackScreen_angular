import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api';
import { Compras } from './compras';

describe('Compras', () => {
  let fixture: ComponentFixture<Compras>;
  let crearCompra: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const pelicula = { id: 1, titulo: 'Película de prueba', sinopsis: 'Una historia',
      posterUrl: 'https://example.com/poster.jpg', trailerUrl: 'https://vimeo.com/12345678' };
    const funcion = { id: 2, pelicula, fecha: '2030-08-10', hora: '18:00',
      sala: '2', precio: 10000, cuposDisponibles: 2 };
    crearCompra = vi.fn(() => of({
      id: 3, cantidadBoletos: 1, valorTotal: 10000, butacas: ['A2']
    }));
    await TestBed.configureTestingModule({
      imports: [Compras],
      providers: [{
        provide: ApiService,
        useValue: {
          getPeliculas: () => of([pelicula]),
          getFunciones: () => of([funcion]),
          getButacas: () => of([
            { codigo: 'A1', ocupada: true },
            { codigo: 'A2', ocupada: false },
            { codigo: 'A3', ocupada: false }
          ]),
          crearCompra
        }
      }]
    }).compileComponents();

    fixture = TestBed.createComponent(Compras);
    await fixture.whenStable();
  });

  it('envía la selección y muestra la butaca confirmada en el boleto imprimible', () => {
    const dom: HTMLElement = fixture.nativeElement;
    dom.querySelector<HTMLButtonElement>('.card .btn')!.click();
    expect(dom.querySelector('.poster')?.getAttribute('style')).toContain('poster.jpg');
    expect(dom.querySelector('.synopsis')?.textContent).toContain('Una historia');
    expect(dom.querySelector('a[target="_blank"]')?.getAttribute('href')).toBe('https://vimeo.com/12345678');

    fixture.componentInstance.compraActual.nombreCliente = 'Cliente de prueba';
    fixture.detectChanges();

    const [ocupada, libre] = dom.querySelectorAll<HTMLButtonElement>('.seat');
    const comprar = dom.querySelector<HTMLButtonElement>('.summary button')!;
    expect(ocupada.disabled).toBe(true);
    expect(comprar.disabled).toBe(true);

    libre.click();
    fixture.detectChanges();
    expect(libre.getAttribute('aria-pressed')).toBe('true');
    expect(comprar.disabled).toBe(false);
    comprar.click();

    expect(crearCompra).toHaveBeenCalledWith({
      funcion: { id: 2 }, nombreCliente: 'Cliente de prueba', cantidadBoletos: 1, butacas: ['A2']
    });
    expect(dom.querySelector('#printArea')?.textContent).toContain('A2');
  });
});
