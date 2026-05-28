import type { Provincia } from './provincia';

export interface Localidad {
  idLocalidad: string;
  nombre: string;
  idProvincia: string;
  oProvincia?: Provincia;
}
