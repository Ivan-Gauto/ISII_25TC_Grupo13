export interface Contrato {
  id: string;
  inquilino: string;
  dniInquilino: string;
  direccion: string;
  inmueble: string;
  precioCuota: number;
  cantCuotas: number;
  fechaCreacion: string;
  fechaFin: string;
  moraMensual: number;
  moraDiaria: number;
  moraDiariaMonto: number;
  estado: number;
}

export interface CrearContratoRequest {
  fechaCreacion: string;
  fechaFin: string;
  cantidadCuotas: number;
  precioCuota: number;
  tasaMoraMensual: number;
  condiciones?: string;
  inmuebleId: string;
  dniInquilino: string;
  rolInquilinoId: string;
  frecuenciaAjuste?: string;
  idTipoIndice?: string;
  valorIndiceInicio?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  mensaje?: string;
  error?: string;
  count?: number;
}

export interface Kpis {
  total: number;
  activos: number;
  porVencer: number;
}
