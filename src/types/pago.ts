export interface Pago {
  id: number;
  contratoId: number;
  cuotaId: number;
  inquilino: string;
  inmueble: string;
  nroCuota: number;
  periodo: string;
  fechaVencimiento: string;
  fechaPago?: string;
  monto: number;
  mora: number;
  diasAtraso: number;
  totalPagado: number;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Anulado';
  estadoTexto: string;
}

export interface CuotaPendiente {
  idCuota: string;
  nroCuota: number;
  periodo: string;
  precioCuota: number;
  fechaVencimiento: string;
  valorIndiceAplicado: number;
  importeActualizado: number;
  diasAtraso: number;
  moraCalculada: number;
  totalFinal: number;
  estado: string;
}

export interface RegistrarPagoRequest {
  idCuota: string;
  idMetodoPago: string;
  monto: number;
  periodo: string;
}

export interface CuotaCalculada {
  idCuota: string;
  nroCuota: number;
  periodo: string;
  fechaVencimiento: string;
  precioCuota: number;
  valorIndiceAplicado: number;
  importeActualizado: number;
  totalAdicionales: number;
  totalDescuentos: number;
  diasAtraso: number;
  moraCalculada: number;
  totalFinal: number;
  estado: string;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  descripcion?: string;
}

export interface DetallePagoResponse {
  cuota: CuotaCalculada;
  metodosPago: MetodoPago[];
}
