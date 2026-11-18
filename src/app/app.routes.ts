import { Routes } from '@angular/router';
import { PeliculasComponent } from './components/peliculas/peliculas';
import { Funciones } from './components/funciones/funciones';
import { Compras } from './components/compras/compras';
import { Historial } from './components/historial/historial';

export const routes: Routes = [
  { path: 'compras', component: Compras },
  { path: 'peliculas', component: PeliculasComponent },
  { path: 'funciones', component: Funciones },
  { path: 'historial', component: Historial },
  { path: '', redirectTo: '/compras', pathMatch: 'full' }
];
