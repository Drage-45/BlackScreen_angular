import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api';
import { Funciones } from './funciones';

describe('Funciones', () => {
  it('consulta y muestra las butacas de la función de la fila', async () => {
    const getButacas = vi.fn(() => of([
      { codigo: 'A1', ocupada: false },
      { codigo: 'A2', ocupada: true }
    ]));
    await TestBed.configureTestingModule({
      imports: [Funciones],
      providers: [{
        provide: ApiService,
        useValue: {
          getPeliculas: () => of([]),
          getFunciones: () => of([{ id: 7, sala: '2', pelicula: { titulo: 'Prueba' } }]),
          getButacas
        }
      }]
    }).compileComponents();

    const fixture = TestBed.createComponent(Funciones);
    await fixture.whenStable();
    const dom: HTMLElement = fixture.nativeElement;
    const dialog = dom.querySelector('dialog')!;
    const abrir = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.showModal = abrir;
    dom.querySelector<HTMLButtonElement>('.table-actions button')!.click();
    await fixture.whenStable();

    expect(abrir).toHaveBeenCalledOnce();
    expect(getButacas).toHaveBeenCalledWith(7);
    expect(dialog.querySelector('.mapa-fila')?.textContent).toContain('A1');
    expect(dialog.querySelector('.mapa-fila .ocupada')?.textContent).toContain('A2');
    expect(dialog.querySelector('.mapa-fila button')).toBeNull();
  });
});
