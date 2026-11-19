import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Butaca {
  codigo: string;
  ocupada: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}
// Módulo Películas
  getPeliculas(): Observable<any> { return this.http.get(`${this.baseUrl}/peliculas`); }
  crearPelicula(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/peliculas`, data); }
  actualizarPelicula(id: number, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/peliculas/${id}`, data); }
  eliminarPelicula(id: number): Observable<any> { return this.http.delete(`${this.baseUrl}/peliculas/${id}`); }

  // Módulo Compras
  getCompras(): Observable<any> { return this.http.get(`${this.baseUrl}/compras`); }
  crearCompra(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/compras`, data); }

  getButacas(funcionId: number): Observable<Butaca[]> {
    return this.http.get<Butaca[]>(`${this.baseUrl}/funciones/${funcionId}/butacas`);
  }

  // Módulo Funciones
  getFunciones(): Observable<any> { return this.http.get(`${this.baseUrl}/funciones`); }
  crearFuncion(data: any): Observable<any> { return this.http.post(`${this.baseUrl}/funciones`, data); }
  actualizarFuncion(id: number, data: any): Observable<any> { return this.http.put(`${this.baseUrl}/funciones/${id}`, data); }
  eliminarFuncion(id: number): Observable<any> { return this.http.delete(`${this.baseUrl}/funciones/${id}`); }
}
