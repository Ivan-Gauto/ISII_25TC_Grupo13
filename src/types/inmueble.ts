import type { Direccion } from './direccion';

export interface Inmueble {
  id?: string;
  idDireccion: string;
  descripcion: string;
  estado?: string;
  fechaCreacion?: string;
  idPersonaPropietario: string;
  idRolClientePropietario: string;
  disponibilidad: boolean;
  idTipoInmueble: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  idLocalidad?: string;
  idProvincia?: string;
  propietarioNombreCompleto?: string;
  oDireccion?: Direccion;
}
