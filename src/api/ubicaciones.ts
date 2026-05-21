import api, { type ApiResponse } from './index';
import type { Provincia } from '../types/provincia';
import type { Localidad } from '../types/localidad';

export const ubicacionesApi = {
  listarProvincias: async (): Promise<Provincia[]> => {
    const response = await api.get<ApiResponse<Provincia[]>>('/provincia');
    return response.data.data || [];
  },

  listarLocalidades: async (idProvincia?: string): Promise<Localidad[]> => {
    const url = idProvincia ? `/localidad?idProvincia=${idProvincia}` : '/localidad';
    const response = await api.get<ApiResponse<Localidad[]>>(url);
    return response.data.data || [];
  },
};
