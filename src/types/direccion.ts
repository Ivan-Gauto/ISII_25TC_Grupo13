import type { Localidad } from './localidad';

export interface Direccion {
  idDireccion?: string;
  calle: string;
  altura: string;
  idLocalidad?: string;
  oLocalidad?: Localidad;
}
