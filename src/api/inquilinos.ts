import api, { type ApiResponse } from './index';
import type { Inquilino } from '../types/inquilino';

export const inquilinosApi = {
  ListarInquilinos: async (): Promise<Inquilino[]> => {
    const response = await api.get<ApiResponse<Inquilino[]>>('/inquilino');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener inquilinos');
  },

  listarConContratos: async (): Promise<Inquilino[]> => {
    const response = await api.get<ApiResponse<Inquilino[]>>('/inquilino/con-contratos');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.mensaje || 'Error al obtener inquilinos con contratos');
  },
};

export default api;