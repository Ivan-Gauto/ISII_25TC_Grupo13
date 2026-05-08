import { useEffect, useState, useMemo } from 'react';
import { 
  Box, Typography, Container, TextField, 
  Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar,
  Select, MenuItem, IconButton, Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon,
  HighlightOff as HighlightOffIcon 
} from '@mui/icons-material';
import { contratosApi } from '../api/contratos';
import { inquilinosApi } from '../api/inquilinos';
import { inmueblesApi } from '../api/inmuebles';
import { indicesApi } from '../api/indices';
import type { Contrato, CrearContratoRequest } from '../types/contrato';
import type { Inquilino } from '../types/inquilino';
import type { Inmueble } from '../types/inmueble';
import { useAuth } from '../context/AuthContext';
import { ESTADOS_CONTRATO, FRECUENCIAS_AJUSTE } from '../utils/constants';
import { SearchInput } from '../components/common/SearchInput';
import { StatusChip } from '../components/common/StatusChip';
import { formatCurrency, formatDate, toInputDate, isPorVencer } from '../utils/formatters';





const initialFormData: CrearContratoRequest = {
  fechaInicio: toInputDate(),
  fechaFin: toInputDate(new Date(new Date().setMonth(new Date().getMonth() + 12))),
  cantidadCuotas: 12,
  precioCuota: 0,
  tasaMoraMensual: 0,
  condiciones: '',
  inmuebleId: '',
  dniInquilino: '',
  rolInquilinoId: '',
  frecuenciaAjuste: FRECUENCIAS_AJUSTE[1],
  idTipoIndice: '',
  valorIndiceInicio: null,
};

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAdmin } = useAuth();
  
  // Filtering state
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state for confirming termination
  const [rescindirDialog, setRescindirDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [dialogLoading, setDialogLoading] = useState(false);

  // Dialog state for creating contract
  const [crearDialog, setCrearDialog] = useState(false);
  const [crearLoading, setCrearLoading] = useState(false);
  const [formData, setFormData] = useState<CrearContratoRequest>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  // Data for selects
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([]);
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [tipoIndices, setTipoIndices] = useState<any[]>([]);

  // Success snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const fetchContratos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contratosApi.listar();
      setContratos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  };

  const fetchInquilinos = async () => {
    try {
      const data = await inquilinosApi.ListarInquilinos();
      setInquilinos(data);
    } catch (err) {
      console.error('Error al cargar inquilinos:', err);
    }
  };

  const fetchInmuebles = async () => {
    try {
      const data = await inmueblesApi.listarDisponibles();
      setInmuebles(data);
    } catch (err) {
      console.error('Error al cargar inmuebles:', err);
    }
  };

  const fetchTipoIndices = async () => {
    try {
      const response = await indicesApi.listarTipos();
      const filtered = (response.data || []).filter((idx: any) => 
        idx.nombre === 'IPC' || idx.nombre === 'ICL'
      );
      setTipoIndices(filtered);
    } catch (err) {
      console.error('Error al cargar tipos de índices:', err);
    }
  };

  const openCrearDialog = () => {
    fetchInquilinos();
    fetchInmuebles();
    fetchTipoIndices();
    setCrearDialog(true);
  };

  useEffect(() => {
    fetchContratos();
  }, []);

  const handleRescindir = async () => {
    if (!rescindirDialog.id) return;
    try {
      setDialogLoading(true);
      await contratosApi.rescindir(rescindirDialog.id);
      setRescindirDialog({ open: false, id: null });
      fetchContratos();
      setSnackbar({ open: true, message: 'Contrato rescindido exitosamente' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al rescindir contrato');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleCrearContrato = async () => {
    setFormError(null);
    
    // Validaciones básicas
    if (!formData.fechaInicio) {
      setFormError('La fecha de inicio es obligatoria');
      return;
    }
    if (formData.cantidadCuotas <= 0) {
      setFormError('La cantidad de cuotas debe ser mayor a 0');
      return;
    }
    if (formData.precioCuota <= 0) {
      setFormError('El precio de la cuota debe ser mayor a 0');
      return;
    }
    if (!formData.dniInquilino) {
      setFormError('El DNI del inquilino es obligatorio');
      return;
    }
    if (!formData.inmuebleId) {
      setFormError('Debe seleccionar un inmueble');
      return;
    }

    try {
      setCrearLoading(true);
      await contratosApi.crear(formData);
      setCrearDialog(false);
      setFormData(initialFormData);
      fetchContratos();
      setSnackbar({ open: true, message: 'Contrato creado exitosamente' });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear contrato');
    } finally {
      setCrearLoading(false);
    }
  };

  const handleFormChange = (field: keyof CrearContratoRequest, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-calculate fechaFin if fechaInicio or cantidadCuotas change
      if ((field === 'fechaInicio' || field === 'cantidadCuotas') && newData.fechaInicio && newData.cantidadCuotas > 0) {
        const start = new Date(newData.fechaInicio);
        if (!isNaN(start.getTime())) {
          start.setMonth(start.getMonth() + Number(newData.cantidadCuotas));
          newData.fechaFin = toInputDate(start);
        }
      }
      
      return newData;
    });
  };

  const handleIndexChange = async (val: string) => {
    handleFormChange('idTipoIndice', val);

    if (!val) {
      setFormData(prev => ({ ...prev, valorIndiceInicio: null }));
      return;
    }

    try {
      // El backend resuelve el caché y la API externa automáticamente
      const res = await indicesApi.obtenerValorActual(val);
      if (res.success && res.data) {
        setFormData(prev => ({ ...prev, valorIndiceInicio: Number(res.data.valor) }));
      }
    } catch (err) {
      console.error('Error al obtener el valor del índice:', err);
    }
  };


  const filteredContratos = useMemo(() => {
    let result = contratos;

    // Filter by Tab
    if (tabValue === 1) {
      // Activos
      result = result.filter(c => c.estado === ESTADOS_CONTRATO.ACTIVO);
    } else if (tabValue === 2) {
      // Por Vencer
      result = result.filter(c => c.estado === ESTADOS_CONTRATO.ACTIVO && isPorVencer(c.fechaFin));
    } else if (tabValue === 3) {
      // Rescindidos
      result = result.filter(c => c.estado !== ESTADOS_CONTRATO.ACTIVO);
    }

    // Filter by Search Term
    if (searchTerm) {
      const lowerSrc = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.inquilino.toLowerCase().includes(lowerSrc) ||
        c.direccion?.toLowerCase().includes(lowerSrc) ||
        c.inmueble?.toLowerCase().includes(lowerSrc) ||
        c.id.toString().includes(lowerSrc)
      );
    }

    return result;
  }, [contratos, tabValue, searchTerm]);

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* Header Minimalista */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-1.5px' }}>
            Contratos
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}>
            Listado maestro de operaciones vigentes e históricas.
          </Typography>
        </Box>
        
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={openCrearDialog}
          sx={{ 
            bgcolor: '#fff', 
            color: '#000', 
            px: 4, 
            py: 1.5, 
            borderRadius: '12px',
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.95rem',
            '&:hover': { bgcolor: '#f0f0f0', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' },
            boxShadow: 'none'
          }}
        >
          Nuevo Contrato
        </Button>
      </Box>

      {/* Barra de Métricas Sobria */}
      <Box sx={{ 
        display: 'flex', 
        gap: 6, 
        mb: 6, 
        pb: 4, 
        borderBottom: '1px solid rgba(255,255,255,0.05)' 
      }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>ACTIVOS</Typography>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 300 }}>{contratos.filter(c => c.estado === 1).length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>POR VENCER</Typography>
          <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 300 }}>{contratos.filter(c => c.estado === 1 && isPorVencer(c.fechaFin)).length}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: 1 }}>RESCINDIDOS</Typography>
          <Typography variant="h4" sx={{ color: 'rgba(255,255,255,0.15)', fontWeight: 300 }}>{contratos.filter(c => c.estado !== 1).length}</Typography>
        </Box>
      </Box>

      {/* Controles y Tabla */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <SearchInput 
              placeholder="Filtrar contratos..."
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </Box>
          <Select
            size="small"
            value={tabValue}
            onChange={(e) => setTabValue(e.target.value as number)}
            sx={{ 
              minWidth: 180, 
              borderRadius: '12px', 
              color: '#fff',
              bgcolor: 'rgba(255,255,255,0.03)',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <MenuItem value={0}>Todos</MenuItem>
            <MenuItem value={1}>Activos</MenuItem>
            <MenuItem value={2}>Por Vencer</MenuItem>
            <MenuItem value={3}>Rescindidos</MenuItem>
          </Select>
        </Box>

        <Box sx={{ bgcolor: 'rgba(255,255,255,0.01)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>
          ) : error ? (
            <Box sx={{ p: 4 }}>
              <Alert severity="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.05)', color: '#f44336', border: '1px solid rgba(244, 67, 54, 0.2)', borderRadius: '12px' }}>
                {error}
              </Alert>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600, py: 2.5, pl: 4 }}>INMUEBLE / DIRECCIÓN</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>INQUILINO</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>VIGENCIA</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>MONTO</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>ESTADO</TableCell>
                    {isAdmin && <TableCell align="center" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>ACCIÓN</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredContratos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 6 : 5} sx={{ textAlign: 'center', py: 10 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.2)' }}>No hay contratos registrados</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContratos.map((contrato) => (
                      <TableRow key={contrato.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell sx={{ color: '#fff', fontWeight: 500, py: 3, pl: 4 }}>{contrato.direccion || contrato.inmueble}</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.8)' }}>{contrato.inquilino}</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
                          {formatDate(contrato.fechaInicio)} — {formatDate(contrato.fechaFin)}
                        </TableCell>
                        <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{formatCurrency(contrato.precioCuota)}</TableCell>
                        <TableCell>
                          <StatusChip 
                            label={contrato.estado === 1 ? 'Activo' : 'Rescindido'} 
                            type={contrato.estado === 1 ? 'success' : 'error'} 
                            variant="outlined"
                          />
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="center">
                            {contrato.estado === 1 && (
                              <Tooltip title="Rescindir Contrato">
                                <IconButton 
                                  onClick={() => setRescindirDialog({ open: true, id: contrato.id })}
                                  sx={{ color: 'rgba(244, 67, 54, 0.5)', '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' } }}
                                >
                                  <HighlightOffIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Box>

      {/* Confirmation Dialog for Rescindir */}
      <Dialog 
        open={rescindirDialog.open} 
        onClose={() => !dialogLoading && setRescindirDialog({ open: false, id: null })}
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Rescindir Contrato</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas rescindir este contrato? Esta acción es irreversible y detendrá la generación de nuevas obligaciones asociadas a este alquiler.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setRescindirDialog({ open: false, id: null })} 
            color="inherit" 
            disabled={dialogLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleRescindir} 
            color="error" 
            variant="contained" 
            disabled={dialogLoading}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {dialogLoading ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Rescisión'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Creating Contract */}
      <Dialog 
        open={crearDialog} 
        onClose={() => !crearLoading && setCrearDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Crear Nuevo Contrato
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  label="Fecha de Inicio"
                  type="date"
                  fullWidth
                  value={formData.fechaInicio}
                  onChange={(e) => handleFormChange('fechaInicio', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  label="Cantidad de Cuotas"
                  type="number"
                  fullWidth
                  value={formData.cantidadCuotas}
                  onChange={(e) => handleFormChange('cantidadCuotas', parseInt(e.target.value) || 0)}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  label="Precio de Cuota"
                  type="number"
                  fullWidth
                  value={formData.precioCuota}
                  onChange={(e) => handleFormChange('precioCuota', parseFloat(e.target.value) || 0)}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  label="Tasa Mora Mensual (%)"
                  type="number"
                  fullWidth
                  value={formData.tasaMoraMensual}
                  onChange={(e) => handleFormChange('tasaMoraMensual', parseFloat(e.target.value) || 0)}
                />
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  select
                  label="Inmueble"
                  fullWidth
                  value={formData.inmuebleId || ''}
                  onChange={(e) => handleFormChange('inmuebleId', e.target.value)}

                >
                  <MenuItem value="" disabled>Seleccionar inmueble</MenuItem>
                  {inmuebles.map((inm) => (
                    <MenuItem key={inm.id} value={inm.id}>
                      {inm.direccion}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  select
                  label="Inquilino"
                  fullWidth
                  value={formData.dniInquilino || ''}
                  onChange={(e) => handleFormChange('dniInquilino', e.target.value as string)}
                >
                  <MenuItem value="" disabled>Seleccionar inquilino</MenuItem>
                  {inquilinos.map((inq) => (
                    <MenuItem key={inq.dni} value={inq.dni}>
                      {inq.nombreCompleto}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  select
                  label="Tipo de Índice de Ajuste"
                  fullWidth
                  value={formData.idTipoIndice || ''}
                  onChange={(e) => handleIndexChange(e.target.value as string)}
                >
                  <MenuItem value="" disabled>Seleccionar índice</MenuItem>
                  {tipoIndices.map((idx) => (
                    <MenuItem key={idx.idTipoIndice} value={idx.idTipoIndice}>
                      {idx.nombre} ({idx.descripcion})
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

               <Box sx={{ flex: '1 1 45%', minWidth: 200 }}>
                <TextField
                  select
                  label="Frecuencia de Ajuste"
                  fullWidth
                  value={formData.frecuenciaAjuste || ''}
                  onChange={(e) => handleFormChange('frecuenciaAjuste', e.target.value as string)}
                >
                  <MenuItem value="" disabled>Seleccionar frecuencia</MenuItem>
                  {FRECUENCIAS_AJUSTE.map(f => (
                    <MenuItem key={f} value={f}>{f}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Fila de Datos Calculados */}
              <Box sx={{ flex: '1 1 100%', display: 'flex', gap: 2, mt: 1, mb: 1 }}>
                <Box sx={{ flex: 1, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #fff', borderRadius: '4px 8px 8px 4px', bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Fecha de Finalización
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', mt: 0.5 }}>
                    {formData.fechaFin ? formatDate(formData.fechaFin) : '---'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, p: 2, border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #4361ee', borderRadius: '4px 8px 8px 4px', bgcolor: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Valor del Índice Actual
                    </Typography>
                    <Tooltip title="Actualizar valor">
                      <IconButton 
                        size="small" 
                        onClick={() => formData.idTipoIndice && handleIndexChange(formData.idTipoIndice)}
                        sx={{ mt: -0.5, mr: -0.5, color: '#4361ee', '&:hover': { bgcolor: 'rgba(67, 97, 238, 0.1)', transform: 'rotate(180deg)' }, transition: 'all 0.3s' }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#4361ee', mt: 0.5 }}>
                    {formData.valorIndiceInicio === null ? 'Pendiente' : formData.valorIndiceInicio.toLocaleString('es-AR')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: '1 1 100%', minWidth: 200 }}>
                <TextField
                  label="Condiciones"
                  multiline
                  rows={3}
                  fullWidth
                  value={formData.condiciones}
                  onChange={(e) => handleFormChange('condiciones', e.target.value)}
                  placeholder="Escribe las condiciones del contrato..."
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => {
              setCrearDialog(false);
              setFormData(initialFormData);
              setFormError(null);
            }} 
            color="inherit" 
            disabled={crearLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCrearContrato} 
            color="primary" 
            variant="contained" 
            disabled={crearLoading}
            sx={{ fontWeight: 600, px: 3, borderRadius: 2 }}
          >
            {crearLoading ? <CircularProgress size={24} color="inherit" /> : 'Crear Contrato'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
}
