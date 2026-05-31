import api, { type ApiResponse } from './index';
import type { TipoAdicional } from '../types/pago';

export const adicionalesApi = {
  listarTipos: async (): Promise<TipoAdicional[]> => {
    const response = await api.get<ApiResponse<TipoAdicional[]>>('/TipoAdicional');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener tipos de adicionales');
  },

  crear: async (idCuota: string, idTipoAdicionales: string, montoAplicado: number, descripcionManual?: string): Promise<void> => {
    const response = await api.post<ApiResponse<void>>('/CuotaAdicional', {
      idCuota,
      idTipoAdicionales,
      montoAplicado,
      descripcionManual
    });
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al crear adicional');
    }
  },

  actualizarDescuento: async (idCuota: string, descuento: number): Promise<void> => {
    const response = await api.patch<ApiResponse<void>>(`/Cuota/${idCuota}/descuento`, { descuento });
    if (!response.data.success) {
      throw new Error(response.data.mensaje || 'Error al actualizar descuento');
    }
  }
};