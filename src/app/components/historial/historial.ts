import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial.html',
  styleUrl: './historial.css'
})
export class Historial implements OnInit {
  compras: any[] = [];

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.apiService.getCompras().subscribe(data => {
      this.compras = data;
      this.cdr.detectChanges();
    });
  }
}
